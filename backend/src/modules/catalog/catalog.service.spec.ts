import { Test, TestingModule } from '@nestjs/testing';

import { CatalogService } from './catalog.service';
import {
  CATALOG_PROVIDER,
  CatalogProvider,
  CatalogSearchResult,
} from './providers/catalog-provider.interface';

describe('CatalogService', () => {
  let service: CatalogService;
  let provider: CatalogProvider;

  const mockSearchResult: CatalogSearchResult = {
    items: [
      {
        externalId: '157336',
        title: 'Interstellar',
        description: 'A team of explorers...',
        imageUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
        releaseDate: '2014-11-05',
      },
    ],
    pagination: {
      page: 1,
      totalPages: 10,
      totalItems: 198,
    },
  };

  const mockProvider = {
    searchMovies: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: CATALOG_PROVIDER,
          useValue: mockProvider,
        },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
    provider = module.get<CatalogProvider>(CATALOG_PROVIDER);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(provider).toBeDefined();
  });

  it('should delegate searchMovies to catalogProvider', async () => {
    mockProvider.searchMovies.mockResolvedValue(mockSearchResult);

    const result = await service.searchMovies('interstellar', 1);

    expect(mockProvider.searchMovies).toHaveBeenCalledWith('interstellar', 1);
    expect(result).toEqual(mockSearchResult);
  });
});
