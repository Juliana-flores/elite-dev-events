import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

import { EventStatus } from '../enums/event-status.enum';

export class QueryOrganizerEventsDto {
  @ApiPropertyOptional({
    enum: EventStatus,
    description: 'Filter organizer events by status (DRAFT, PUBLISHED, etc.)',
  })
  @IsOptional()
  @IsEnum(EventStatus, { message: 'status must be a valid EventStatus value' })
  status?: EventStatus;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
