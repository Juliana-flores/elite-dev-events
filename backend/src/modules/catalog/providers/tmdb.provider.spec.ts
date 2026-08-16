import { BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { TmdbProvider } from './tmdb.provider';

describe('TmdbProvider', () => {
  let provider: TmdbProvider;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      switch (key) {
        case 'TMDB_BASE_URL':
          return 'https://api.themoviedb.org/3';
        case 'TMDB_API_KEY':
          return 'test-tmdb-api-key';
        case 'TMDB_IMAGE_BASE_URL':
          return 'https://image.tmdb.org/t/p/w500';
        case 'TMDB_TIMEOUT_MS':
          return 2000;
        default:
          return defaultValue;
      }
    }),
  };

  const originalFetch = global.fetch;

  beforeEach(async () => {
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue?: unknown) => {
        switch (key) {
          case 'TMDB_BASE_URL':
            return 'https://api.themoviedb.org/3';
          case 'TMDB_API_KEY':
            return 'test-tmdb-api-key';
          case 'TMDB_IMAGE_BASE_URL':
            return 'https://image.tmdb.org/t/p/w500';
          case 'TMDB_TIMEOUT_MS':
            return 2000;
          default:
            return defaultValue;
        }
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TmdbProvider,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    provider = module.get<TmdbProvider>(TmdbProvider);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should return empty items when query is whitespace', async () => {
    const result = await provider.searchMovies('   ');
    expect(result).toEqual({
      items: [],
      pagination: {
        page: 1,
        totalPages: 0,
        totalItems: 0,
      },
    });
  });

  it('should throw BadGatewayException (502) if TMDB_API_KEY is not configured', async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'TMDB_API_KEY') return undefined;
      return 'default';
    });

    const unconfiguredProvider = new TmdbProvider(
      mockConfigService as unknown as ConfigService,
    );

    await expect(unconfiguredProvider.searchMovies('avatar')).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('should fetch movies from TMDb and normalize results correctly', async () => {
    const mockTmdbApiResponse = {
      page: 1,
      results: [
        {
          id: 157336,
          title: 'Interstellar',
          original_title: 'Interstellar',
          overview: 'A team of explorers travel through a wormhole in space...',
          poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
          release_date: '2014-11-05',
        },
        {
          id: 99999,
          title: 'Movie Without Poster',
          original_title: 'Original Title',
          overview: 'Overview text',
          poster_path: null,
          backdrop_path: '/backdrop.jpg',
          release_date: '2020-01-01',
        },
      ],
      total_pages: 5,
      total_results: 98,
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockTmdbApiResponse),
    });

    const result = await provider.searchMovies('Interstellar', 1);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        'https://api.themoviedb.org/3/search/movie?query=Interstellar&page=1',
      ),
      expect.objectContaining({
        method: 'GET',
      }),
    );

    expect(result.pagination).toEqual({
      page: 1,
      totalPages: 5,
      totalItems: 98,
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      externalId: '157336',
      title: 'Interstellar',
      description: 'A team of explorers travel through a wormhole in space...',
      imageUrl:
        'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      releaseDate: '2014-11-05',
    });

    expect(result.items[1]).toEqual({
      externalId: '99999',
      title: 'Movie Without Poster',
      description: 'Overview text',
      imageUrl: 'https://image.tmdb.org/t/p/w500/backdrop.jpg',
      releaseDate: '2020-01-01',
    });
  });

  it('should throw 502 CATALOG_PROVIDER_UNAVAILABLE when TMDb returns non-ok status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    try {
      await provider.searchMovies('batman', 1);
      fail('Should have thrown BadGatewayException');
    } catch (err: unknown) {
      const error = err as BadGatewayException;
      expect(error.getStatus()).toBe(502);
      const response = error.getResponse() as Record<string, unknown>;
      expect(response.code).toBe('CATALOG_PROVIDER_UNAVAILABLE');
    }
  });

  it('should throw 502 CATALOG_PROVIDER_UNAVAILABLE when fetch throws a network/abort error', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('Network connection timeout'));

    try {
      await provider.searchMovies('batman', 1);
      fail('Should have thrown BadGatewayException');
    } catch (err: unknown) {
      const error = err as BadGatewayException;
      expect(error.getStatus()).toBe(502);
      const response = error.getResponse() as Record<string, unknown>;
      expect(response.code).toBe('CATALOG_PROVIDER_UNAVAILABLE');
    }
  });
});
