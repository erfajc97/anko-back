import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterUserDto } from './dto/register.dto';
import { UserType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { v4 as uuidv4 } from 'uuid';

type Tokens = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  private async hashData(data: string): Promise<string> {
    return bcrypt.hash(data, 10);
  }

  private async getTokens(
    userId: string,
    email: string,
    type: UserType,
  ): Promise<Tokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { id: userId, email, type },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
        },
      ),
      this.jwtService.signAsync(
        { id: userId, email, type },
        {
          secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
          expiresIn:
            this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN') || '7d',
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await this.hashData(refreshToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });
  }

  async login(userDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: userDto.email },
    });

    if (!user) throw new NotFoundException('User not found');

    const passwordMatches = await bcrypt.compare(
      userDto.password,
      user.password,
    );
    if (!passwordMatches) throw new ForbiddenException('Wrong credentials');

    const tokens = await this.getTokens(user.id, user.email, user.type);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      message: 'Login exitoso',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        userType: user.type,
      },
    };
  }

  async register(userDto: RegisterUserDto) {
    const { email, confirmEmail, password, firstName, lastName, telephone } =
      userDto;
    if (email !== confirmEmail) {
      throw new BadRequestException('Email does not match');
    }
    const foundUser = await this.prisma.user.findUnique({ where: { email } });
    if (foundUser) {
      throw new ConflictException(`Email ${email} already exist`);
    }

    const ankoOrg = await this.prisma.organization.findFirst({
      where: { name: 'Anko' },
    });

    if (!ankoOrg) {
      throw new NotFoundException(
        'La organización por defecto "Anko" no fue encontrada.',
      );
    }

    const hashedPassword = await this.hashData(password);
    const verificationToken = uuidv4();
    const verificationTokenExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    );

    const newUser = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        telephone,
        verificationToken,
        verificationTokenExpiresAt,
        memberships: {
          create: {
            organizationId: ankoOrg.id,
            role: 'MEMBER',
          },
        },
      },
    });

    const tokens = await this.getTokens(
      newUser.id,
      newUser.email,
      newUser.type,
    );
    await this.updateRefreshToken(newUser.id, tokens.refreshToken);

    const verificationLink = `https://tu-frontend.com/verify-email?token=${verificationToken}`;

    try {
      await this.emailService.sendEmail({
        to: newUser.email,
        subject: `¡Bienvenido a Anko, ${newUser.firstName}!`,
        templateName: 'user-verification',
        replacements: {
          name: newUser.firstName,
          verificationLink,
        },
      });
    } catch (emailError) {
      console.error(
        `[Registro] No se pudo enviar el correo a ${newUser.email}:`,
        emailError,
      );
    }

    return {
      message:
        'Registro exitoso. Por favor, revisa tu correo para verificar tu cuenta.',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiresAt: {
          gte: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException(
        'El token de verificación no es válido o ha expirado.',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiresAt: null,
      },
    });

    return { message: 'Correo verificado exitosamente.' };
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.prisma.user.updateMany({
      where: {
        id: userId,
        hashedRefreshToken: {
          not: null,
        },
      },
      data: {
        hashedRefreshToken: null,
      },
    });
    return { message: 'Logout exitoso' };
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.hashedRefreshToken) {
      throw new ForbiddenException('Access Denied');
    }

    const rtMatches = await bcrypt.compare(
      refreshToken,
      user.hashedRefreshToken,
    );
    if (!rtMatches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(user.id, user.email, user.type);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      message: 'Token refrescado',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }
}
