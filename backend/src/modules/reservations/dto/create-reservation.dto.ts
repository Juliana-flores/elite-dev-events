import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({
    description: 'UUID of the event being reserved',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'eventId is required' })
  @IsUUID('4', { message: 'eventId must be a valid UUID v4' })
  eventId!: string;

  @ApiProperty({
    description: 'Number of tickets to reserve (minimum 1)',
    example: 2,
    minimum: 1,
  })
  @IsNotEmpty({ message: 'quantity is required' })
  @Type(() => Number)
  @IsInt({ message: 'quantity must be an integer' })
  @Min(1, { message: 'quantity must be greater than 0' })
  quantity!: number;
}
