import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  CatalogMovie,
  CatalogProvider,
  CatalogSearchResult,
} from './catalog-provider.interface';

interface TmdbMovieResult {
  id: number;
  title?: string;
  original_title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
}

interface TmdbSearchResponse {
  page?: number;
  results?: TmdbMovieResult[];
  total_pages?: number;
  total_results?: number;
}

@Injectable()
export class TmdbProvider implements CatalogProvider {
  private readonly logger = new Logger(TmdbProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly imageBaseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'TMDB_BASE_URL',
      'https://api.themoviedb.org/3',
    );
    this.apiKey = this.configService.get<string>('TMDB_API_KEY');
    this.imageBaseUrl = this.configService.get<string>(
      'TMDB_IMAGE_BASE_URL',
      'https://image.tmdb.org/t/p/w500',
    );
    this.timeoutMs = this.configService.get<number>('TMDB_TIMEOUT_MS', 5000);
  }

  async searchMovies(query: string, page = 1): Promise<CatalogSearchResult> {
    if (!this.apiKey) {
      this.logger.warn('TMDB_API_KEY is not configured');
      throw new BadGatewayException({
        statusCode: 502,
        code: 'CATALOG_PROVIDER_UNAVAILABLE',
        message: 'External catalog provider is not configured or unavailable',
      });
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return {
        items: [],
        pagination: {
          page: 1,
          totalPages: 0,
          totalItems: 0,
        },
      };
    }

    const searchUrl = new URL(`${this.baseUrl}/search/movie`);
    searchUrl.searchParams.set('query', trimmedQuery);
    searchUrl.searchParams.set('page', String(page));
    searchUrl.searchParams.set('include_adult', 'false');

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    // Support both Bearer tokens (v4 Read Access Token) and standard API keys (v3)
    if (this.apiKey.length > 50) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    } else {
      searchUrl.searchParams.set('api_key', this.apiKey);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(searchUrl.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.error(
          `TMDb API responded with status ${response.status}: ${response.statusText}`,
        );
        throw new BadGatewayException({
          statusCode: 502,
          code: 'CATALOG_PROVIDER_UNAVAILABLE',
          message: 'Failed to fetch catalog data from external provider',
        });
      }

      const data = (await response.json()) as TmdbSearchResponse;

      const items: CatalogMovie[] = (data.results ?? []).map((movie) => {
        const posterPath = movie.poster_path ?? movie.backdrop_path ?? null;
        const imageUrl = posterPath
          ? `${this.imageBaseUrl}${posterPath.startsWith('/') ? '' : '/'}${posterPath}`
          : null;

        return {
          externalId: String(movie.id),
          title: movie.title || movie.original_title || 'Untitled',
          description: movie.overview || '',
          imageUrl,
          releaseDate: movie.release_date || null,
        };
      });

      return {
        items,
        pagination: {
          page: data.page ?? page,
          totalPages: data.total_pages ?? 1,
          totalItems: data.total_results ?? items.length,
        },
      };
    } catch (error: unknown) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      this.logger.error('Error fetching data from TMDb:', error);
      throw new BadGatewayException({
        statusCode: 502,
        code: 'CATALOG_PROVIDER_UNAVAILABLE',
        message: 'External catalog provider is currently unreachable',
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
