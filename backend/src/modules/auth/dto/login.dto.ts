import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'customer1@elite.dev',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsNotEmpty({ message: 'email is required' })
  email!: string;

  @ApiProperty({
    example: 'password',
    description: 'User plain text password for authentication',
  })
  @IsString({ message: 'password must be a string' })
  @IsNotEmpty({ message: 'password is required' })
  password!: string;
}
