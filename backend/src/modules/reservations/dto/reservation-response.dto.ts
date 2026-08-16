import { ApiProperty } from '@nestjs/swagger';

import { ReservationStatus } from '../enums/reservation-status.enum';

export class ReservationResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the reservation',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'UUID of the reserved event',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  eventId!: string;

  @ApiProperty({
    description: 'UUID of the customer who made the reservation',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  customerId!: string;

  @ApiProperty({
    description: 'Quantity of tickets reserved',
    example: 2,
  })
  quantity!: number;

  @ApiProperty({
    description: 'Unit price captured at time of reservation',
    example: '45.90',
  })
  unitPrice!: string;

  @ApiProperty({
    description: 'Total amount calculated (unitPrice * quantity)',
    example: '91.80',
  })
  totalAmount!: string;

  @ApiProperty({
    description: 'Current status of the reservation',
    enum: ReservationStatus,
    example: ReservationStatus.PENDING_PAYMENT,
  })
  status!: ReservationStatus;

  @ApiProperty({
    description: 'Timestamp when the reservation was created',
    example: '2026-08-16T12:00:00.000Z',
  })
  createdAt!: Date;
}
