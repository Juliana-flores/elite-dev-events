import { ApiProperty } from '@nestjs/swagger';

export class CatalogMovieDto {
  @ApiProperty({
    example: '157336',
    description: 'External movie identifier from TMDb',
  })
  externalId!: string;

  @ApiProperty({ example: 'Interstellar', description: 'Movie title' })
  title!: string;

  @ApiProperty({
    example: 'A team of explorers travel through a wormhole in space...',
    description: 'Movie overview/synopsis',
  })
  description!: string;

  @ApiProperty({
    example: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    description: 'Full URL for the movie poster image',
    nullable: true,
  })
  imageUrl!: string | null;

  @ApiProperty({
    example: '2014-11-05',
    description: 'Release date in YYYY-MM-DD format',
    nullable: true,
  })
  releaseDate!: string | null;
}

export class CatalogPaginationDto {
  @ApiProperty({ example: 1, description: 'Current page number' })
  page!: number;

  @ApiProperty({ example: 10, description: 'Total available pages' })
  totalPages!: number;

  @ApiProperty({ example: 198, description: 'Total matching movies found' })
  totalItems!: number;
}

export class CatalogMoviesResponseDto {
  @ApiProperty({
    type: [CatalogMovieDto],
    description: 'List of movie search results',
  })
  items!: CatalogMovieDto[];

  @ApiProperty({
    type: CatalogPaginationDto,
    description: 'Pagination details',
  })
  pagination!: CatalogPaginationDto;
}
