import { IsEmail, MinLength, IsNotEmpty, IsString } from 'class-validator';

export class RegisterUserDto {
  @IsEmail({}, { message: 'Email must be valid' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsEmail({}, { message: 'Confirmation email must be valid' })
  confirmEmail: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(5, { message: 'Password must be at least 5 characters long' })
  password: string;
}
