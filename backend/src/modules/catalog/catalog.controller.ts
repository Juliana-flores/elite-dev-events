import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { ApiErrorResponseDto } from '../auth/dto/auth-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { CatalogService } from './catalog.service';
import { CatalogMoviesResponseDto } from './dto/catalog-movies-response.dto';
import { SearchMoviesQueryDto } from './dto/search-movies-query.dto';
import { CatalogSearchResult } from './providers/catalog-provider.interface';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('movies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Search movies in external catalog (TMDb)',
    description:
      'Allows organizers to search movies in the external TMDb catalog to select and create events.',
  })
  @ApiResponse({
    status: 200,
    description: 'Movies retrieved and normalized successfully',
    type: CatalogMoviesResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error in query parameters',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid, missing, or expired token',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only ORGANIZER role is permitted',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 502,
    description:
      'External catalog provider is unreachable or failed (CATALOG_PROVIDER_UNAVAILABLE)',
    type: ApiErrorResponseDto,
  })
  async searchMovies(
    @Query() queryDto: SearchMoviesQueryDto,
  ): Promise<CatalogSearchResult> {
    return this.catalogService.searchMovies(queryDto.query, queryDto.page);
  }
}
