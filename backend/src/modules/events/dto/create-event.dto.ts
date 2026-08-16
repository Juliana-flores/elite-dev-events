import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({
    example: '157336',
    description: 'External catalog ID from TMDb',
  })
  @IsString({ message: 'externalCatalogId must be a string' })
  @IsNotEmpty({ message: 'externalCatalogId is required' })
  externalCatalogId!: string;

  @ApiProperty({ example: 'Interstellar', description: 'Event title' })
  @IsString({ message: 'title must be a string' })
  @IsNotEmpty({ message: 'title is required' })
  title!: string;

  @ApiPropertyOptional({
    example: 'A team of explorers travel through a wormhole in space...',
    description: 'Event description',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'description must be a string' })
  description?: string | null;

  @ApiPropertyOptional({
    example: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    description: 'Poster or banner image URL',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'imageUrl must be a string' })
  imageUrl?: string | null;

  @ApiProperty({
    example: '2026-09-20T22:00:00.000Z',
    description: 'Event start date and time in ISO 8601 format',
  })
  @IsDateString(
    {},
    { message: 'startsAt must be a valid ISO 8601 date string' },
  )
  @IsNotEmpty({ message: 'startsAt is required' })
  startsAt!: string;

  @ApiProperty({
    example: 'Cine Elite - Sala 1',
    description: 'Event venue/location',
  })
  @IsString({ message: 'location must be a string' })
  @IsNotEmpty({ message: 'location is required' })
  location!: string;

  @ApiProperty({
    example: 120,
    description: 'Total event ticket capacity',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'capacity must be an integer' })
  @Min(1, { message: 'capacity must be greater than 0' })
  capacity!: number;

  @ApiProperty({
    example: '45.90',
    description: 'Ticket unit price in monetary string format (e.g. 45.90)',
  })
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'price must be a valid monetary decimal string (e.g. 45.90)',
  })
  @IsNotEmpty({ message: 'price is required' })
  price!: string;
}
