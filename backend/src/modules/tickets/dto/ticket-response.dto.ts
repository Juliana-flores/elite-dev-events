import { ApiProperty } from '@nestjs/swagger';

import { TicketStatus } from '../enums/ticket-status.enum';

export class TicketEventSummaryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Interstellar' })
  title!: string;

  @ApiProperty({
    example: 'https://image.tmdb.org/t/p/w500/poster.jpg',
    nullable: true,
  })
  imageUrl!: string | null;

  @ApiProperty({ example: '2026-09-20T22:00:00.000Z' })
  startsAt!: Date;

  @ApiProperty({ example: 'Cine Elite - Sala 1' })
  location!: string;
}

export class CustomerTicketDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  id!: string;

  @ApiProperty({
    enum: TicketStatus,
    example: TicketStatus.VALID,
  })
  status!: TicketStatus;

  @ApiProperty({ type: TicketEventSummaryDto })
  event!: TicketEventSummaryDto;

  @ApiProperty({ example: '2026-08-16T12:00:00.000Z' })
  createdAt!: Date;
}

export class CustomerTicketDetailDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  id!: string;

  @ApiProperty({
    enum: TicketStatus,
    example: TicketStatus.VALID,
  })
  status!: TicketStatus;

  @ApiProperty({
    description: 'Cryptographically secure validation token',
    example: 'a4b8c9d0e1f2...',
  })
  secureCode!: string;

  @ApiProperty({
    description: 'Public sharing URL for the ticket',
    example: 'http://localhost:3000/tickets/share/f1e2d3c4...',
  })
  shareUrl!: string;

  @ApiProperty({
    description: 'Payload for client-side QR Code rendering',
    example: 'a4b8c9d0e1f2...',
  })
  qrPayload!: string;

  @ApiProperty({
    description: 'Timestamp when ticket was validated at gate',
    example: null,
    nullable: true,
  })
  validatedAt!: Date | null;

  @ApiProperty({ type: TicketEventSummaryDto })
  event!: TicketEventSummaryDto;
}

export class SharedTicketEventDto {
  @ApiProperty({ example: 'Interstellar' })
  title!: string;

  @ApiProperty({ example: '2026-09-20T22:00:00.000Z' })
  startsAt!: Date;

  @ApiProperty({ example: 'Cine Elite - Sala 1' })
  location!: string;

  @ApiProperty({
    example: 'https://image.tmdb.org/t/p/w500/poster.jpg',
    nullable: true,
  })
  imageUrl!: string | null;
}

export class SharedTicketDataDto {
  @ApiProperty({
    enum: TicketStatus,
    example: TicketStatus.VALID,
  })
  status!: TicketStatus;

  @ApiProperty({
    description: 'Secure QR Code payload for door validation',
    example: 'a4b8c9d0e1f2...',
  })
  qrPayload!: string;

  @ApiProperty({ type: SharedTicketEventDto })
  event!: SharedTicketEventDto;
}

export class SharedTicketResponseDto {
  @ApiProperty({ type: SharedTicketDataDto })
  ticket!: SharedTicketDataDto;
}

export class TicketsPaginationDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 2 })
  totalItems!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class PaginatedCustomerTicketsResponseDto {
  @ApiProperty({ type: [CustomerTicketDto] })
  items!: CustomerTicketDto[];

  @ApiProperty({ type: TicketsPaginationDto })
  pagination!: TicketsPaginationDto;
}
