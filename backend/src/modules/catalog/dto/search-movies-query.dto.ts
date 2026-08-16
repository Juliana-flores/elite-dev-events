import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class SearchMoviesQueryDto {
  @ApiProperty({
    description: 'Movie title search query (minimum 2 characters)',
    example: 'interstellar',
    minLength: 2,
  })
  @IsString({ message: 'query must be a string' })
  @IsNotEmpty({ message: 'query is required' })
  @MinLength(2, { message: 'query must be at least 2 characters long' })
  query!: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be greater than or equal to 1' })
  page: number = 1;
}
