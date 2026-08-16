import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ValidateTicketDto {
  @ApiProperty({
    description: 'UUID of the event being validated at the gate',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'eventId is required' })
  @IsUUID('4', { message: 'eventId must be a valid UUID v4' })
  eventId!: string;

  @ApiProperty({
    description:
      'Secure code read from QR Code or typed manually by gate staff',
    example: 'a4b8c9d0e1f2...',
  })
  @IsNotEmpty({ message: 'code is required' })
  @IsString({ message: 'code must be a string' })
  code!: string;
}
