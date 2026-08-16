import { ApiProperty } from '@nestjs/swagger';

import { ReservationStatus } from '../../reservations/enums/reservation-status.enum';
import { TicketStatus } from '../../tickets/enums/ticket-status.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

export class PaymentReservationSummaryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({
    enum: ReservationStatus,
    example: ReservationStatus.PAID,
  })
  status!: ReservationStatus;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: '91.80' })
  totalAmount!: string;
}

export class PaymentSummaryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  id!: string;

  @ApiProperty({
    enum: PaymentStatus,
    example: PaymentStatus.APPROVED,
  })
  status!: PaymentStatus;

  @ApiProperty({ example: 'FAKE' })
  provider!: string;

  @ApiProperty({ example: '91.80' })
  amount!: string;
}

export class PaymentTicketSummaryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  id!: string;

  @ApiProperty({
    enum: TicketStatus,
    example: TicketStatus.VALID,
  })
  status!: TicketStatus;
}

export class ProcessPaymentResponseDto {
  @ApiProperty({ type: PaymentReservationSummaryDto })
  reservation!: PaymentReservationSummaryDto;

  @ApiProperty({ type: PaymentSummaryDto })
  payment!: PaymentSummaryDto;

  @ApiProperty({ type: [PaymentTicketSummaryDto] })
  tickets!: PaymentTicketSummaryDto[];
}
