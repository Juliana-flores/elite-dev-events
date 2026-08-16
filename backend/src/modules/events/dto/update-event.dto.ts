import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class UpdateEventDto {
  @ApiPropertyOptional({
    example: '2026-09-21T22:00:00.000Z',
    description: 'Updated event start date and time',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'startsAt must be a valid ISO 8601 date string' },
  )
  startsAt?: string;

  @ApiPropertyOptional({
    example: 'Cine Elite - Sala 2',
    description: 'Updated venue location',
  })
  @IsOptional()
  @IsString({ message: 'location must be a string' })
  location?: string;

  @ApiPropertyOptional({
    example: 150,
    description: 'Updated capacity',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'capacity must be an integer' })
  @Min(1, { message: 'capacity must be greater than 0' })
  capacity?: number;

  @ApiPropertyOptional({
    example: '49.90',
    description: 'Updated ticket price',
  })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'price must be a valid monetary decimal string (e.g. 49.90)',
  })
  price?: string;
}
