import {
  BadGatewayException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { CatalogController } from '../src/modules/catalog/catalog.controller';
import { CatalogService } from '../src/modules/catalog/catalog.service';
import { CATALOG_PROVIDER } from '../src/modules/catalog/providers/catalog-provider.interface';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { UsersService } from '../src/modules/users/users.service';

describe('Catalog Integration / E2E', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const mockOrganizer = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Organizer One',
    email: 'organizer1@elite.dev',
    role: UserRole.ORGANIZER,
  };

  const mockCustomer = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Customer One',
    email: 'customer1@elite.dev',
    role: UserRole.CUSTOMER,
  };

  const mockCatalogResult = {
    items: [
      {
        externalId: '157336',
        title: 'Interstellar',
        description:
          'A team of explorers travel through a wormhole in space...',
        imageUrl:
          'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
        releaseDate: '2014-11-05',
      },
    ],
    pagination: {
      page: 1,
      totalPages: 10,
      totalItems: 198,
    },
  };

  const mockCatalogProvider = {
    searchMovies: jest.fn(),
  };

  const mockUsersService = {
    findById: jest.fn((id: string) => {
      if (id === mockOrganizer.id) return Promise.resolve(mockOrganizer);
      if (id === mockCustomer.id) return Promise.resolve(mockCustomer);
      return Promise.resolve(null);
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-secret-key-for-catalog-e2e',
              JWT_EXPIRES_IN: '1d',
            }),
          ],
        }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            secret: configService.getOrThrow<string>('JWT_SECRET'),
            signOptions: {
              expiresIn: configService.get('JWT_EXPIRES_IN', '1d'),
            },
          }),
        }),
      ],
      controllers: [CatalogController],
      providers: [
        CatalogService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: CATALOG_PROVIDER,
          useValue: mockCatalogProvider,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  interface ApiErrorResponse {
    statusCode: number;
    code: string;
    message?: string;
  }

  describe('GET /api/v1/catalog/movies', () => {
    it('should allow ORGANIZER to search movies and return normalized data', async () => {
      mockCatalogProvider.searchMovies.mockResolvedValue(mockCatalogResult);

      const token = await jwtService.signAsync({
        sub: mockOrganizer.id,
        role: mockOrganizer.role,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/catalog/movies?query=interstellar&page=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockCatalogResult);
      expect(mockCatalogProvider.searchMovies).toHaveBeenCalledWith(
        'interstellar',
        1,
      );
    });

    it('should reject CUSTOMER access with 403 FORBIDDEN', async () => {
      const token = await jwtService.signAsync({
        sub: mockCustomer.id,
        role: mockCustomer.role,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/catalog/movies?query=interstellar')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      const body = response.body as ApiErrorResponse;
      expect(body.statusCode).toBe(403);
      expect(body.code).toBe('FORBIDDEN');
    });

    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/catalog/movies?query=interstellar')
        .expect(401);

      const body = response.body as ApiErrorResponse;
      expect(body.statusCode).toBe(401);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('should reject query with less than 2 characters with 400 Bad Request', async () => {
      const token = await jwtService.signAsync({
        sub: mockOrganizer.id,
        role: mockOrganizer.role,
      });

      await request(app.getHttpServer())
        .get('/api/v1/catalog/movies?query=a')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('should return 502 CATALOG_PROVIDER_UNAVAILABLE when external TMDb fails', async () => {
      mockCatalogProvider.searchMovies.mockRejectedValue(
        new BadGatewayException({
          statusCode: 502,
          code: 'CATALOG_PROVIDER_UNAVAILABLE',
          message: 'External catalog provider is currently unreachable',
        }),
      );

      const token = await jwtService.signAsync({
        sub: mockOrganizer.id,
        role: mockOrganizer.role,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/catalog/movies?query=interstellar')
        .set('Authorization', `Bearer ${token}`)
        .expect(502);

      const body = response.body as ApiErrorResponse;
      expect(body.statusCode).toBe(502);
      expect(body.code).toBe('CATALOG_PROVIDER_UNAVAILABLE');
    });
  });
});
