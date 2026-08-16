import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogSearchResult } from './providers/catalog-provider.interface';

describe('CatalogController', () => {
  let controller: CatalogController;
  let service: CatalogService;

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

  const mockCatalogService = {
    searchMovies: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        {
          provide: CatalogService,
          useValue: mockCatalogService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CatalogController>(CatalogController);
    service = module.get<CatalogService>(CatalogService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  it('should return movie results when calling searchMovies with query and page', async () => {
    mockCatalogService.searchMovies.mockResolvedValue(mockSearchResult);

    const result = await controller.searchMovies({
      query: 'interstellar',
      page: 1,
    });

    expect(mockCatalogService.searchMovies).toHaveBeenCalledWith(
      'interstellar',
      1,
    );
    expect(result).toEqual(mockSearchResult);
  });
});
