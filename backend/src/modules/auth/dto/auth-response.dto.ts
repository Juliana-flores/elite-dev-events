import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/enums/user-role.enum';

export class AuthUserDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'User unique identifier (UUID)',
  })
  id!: string;

  @ApiProperty({ example: 'Customer One', description: 'User full name' })
  name!: string;

  @ApiProperty({ example: 'customer1@elite.dev', description: 'User email' })
  email!: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.CUSTOMER,
    description: 'User role',
  })
  role!: UserRole | string;
}

export class LoginResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT Access Token',
  })
  accessToken!: string;

  @ApiProperty({
    type: () => AuthUserDto,
    description: 'Authenticated user profile',
  })
  user!: AuthUserDto;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: 401, description: 'HTTP status code' })
  statusCode!: number;

  @ApiProperty({
    example: 'INVALID_CREDENTIALS',
    description: 'Domain error code',
  })
  code!: string;

  @ApiProperty({
    example: 'Invalid email or password',
    description: 'Human readable message',
  })
  message!: string;
}
