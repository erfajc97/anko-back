import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserType } from '@prisma/client';
import { UsersService } from '../../users/users.service';
import { LoggedInUserData } from '../../interfaces/authenticated-user.interface';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as LoggedInUserData;

    if (!user) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const foundUser = await this.usersService.findOne(user.id);

    if (!foundUser || user.type !== UserType.ADMIN) {
      throw new ForbiddenException('Acceso denegado: solo administradores');
    }

    return true;
  }
}
