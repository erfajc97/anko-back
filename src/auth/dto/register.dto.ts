import {
  IsEmail,
  MinLength,
  IsNotEmpty,
  IsString,
  IsOptional,
  Length,
} from 'class-validator';

export class RegisterUserDto {
  @IsEmail({}, { message: 'Email must be valid' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsEmail({}, { message: 'Confirmation email must be valid' })
  confirmEmail: string;

  @IsString()
  @IsNotEmpty({ message: 'Cédula es requerida' })
  @Length(10, 10, { message: 'La cédula debe tener exactamente 10 dígitos' })
  cedula: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(5, { message: 'Password must be at least 5 characters long' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  telephone?: string;
}
