import { ApiProperty } from '@nestjs/swagger';

import { EventStatus } from '../enums/event-status.enum';

export class EventDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Event unique identifier',
  })
  id!: string;

  @ApiProperty({
    example: 'u1v2w3x4-y5z6-7890-abcd-ef1234567890',
    description: 'Organizer user identifier',
  })
  organizerId!: string;

  @ApiProperty({ example: '157336', description: 'External TMDb movie ID' })
  externalCatalogId!: string;

  @ApiProperty({ example: 'Interstellar', description: 'Event title' })
  title!: string;

  @ApiProperty({
    example: 'A team of explorers travel through a wormhole in space...',
    description: 'Event description',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    example: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    description: 'Image URL',
    nullable: true,
  })
  imageUrl!: string | null;

  @ApiProperty({
    example: '2026-09-20T22:00:00.000Z',
    description: 'Start date and time',
  })
  startsAt!: Date | string;

  @ApiProperty({
    example: 'Cine Elite - Sala 1',
    description: 'Venue location',
  })
  location!: string;

  @ApiProperty({ example: 120, description: 'Total capacity' })
  capacity!: number;

  @ApiProperty({ example: '45.90', description: 'Ticket unit price' })
  price!: string;

  @ApiProperty({
    enum: EventStatus,
    example: EventStatus.DRAFT,
    description: 'Event status',
  })
  status!: EventStatus;

  @ApiProperty({
    example: '2026-08-15T21:00:00.000Z',
    description: 'Creation timestamp',
  })
  createdAt!: Date | string;

  @ApiProperty({
    example: '2026-08-15T21:00:00.000Z',
    description: 'Last update timestamp',
  })
  updatedAt!: Date | string;
}

export class PublicEventDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Event ID',
  })
  id!: string;

  @ApiProperty({ example: 'Interstellar', description: 'Event title' })
  title!: string;

  @ApiProperty({
    example: 'A team of explorers travel through a wormhole in space...',
    description: 'Event description',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    example: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    description: 'Image URL',
    nullable: true,
  })
  imageUrl!: string | null;

  @ApiProperty({
    example: '2026-09-20T22:00:00.000Z',
    description: 'Start date and time',
  })
  startsAt!: Date | string;

  @ApiProperty({
    example: 'Cine Elite - Sala 1',
    description: 'Venue location',
  })
  location!: string;

  @ApiProperty({ example: 120, description: 'Total event capacity' })
  capacity!: number;

  @ApiProperty({ example: 120, description: 'Currently available tickets' })
  availableTickets!: number;

  @ApiProperty({ example: '45.90', description: 'Ticket price' })
  price!: string;

  @ApiProperty({
    enum: EventStatus,
    example: EventStatus.PUBLISHED,
    description: 'Event status',
  })
  status!: EventStatus;
}

export class PublishEventResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ enum: EventStatus, example: EventStatus.PUBLISHED })
  status!: EventStatus;

  @ApiProperty({ example: true })
  published!: boolean;
}

export class EventsPaginationDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 1 })
  totalItems!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class PaginatedPublicEventsResponseDto {
  @ApiProperty({ type: [PublicEventDto] })
  items!: PublicEventDto[];

  @ApiProperty({ type: EventsPaginationDto })
  pagination!: EventsPaginationDto;
}

export class PaginatedOrganizerEventsResponseDto {
  @ApiProperty({ type: [EventDto] })
  items!: EventDto[];

  @ApiProperty({ type: EventsPaginationDto })
  pagination!: EventsPaginationDto;
}
