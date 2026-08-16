import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';

import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { Event } from '../src/modules/events/entities/event.entity';
import { EventStatus } from '../src/modules/events/enums/event-status.enum';
import { EventsController } from '../src/modules/events/events.controller';
import { EventsService } from '../src/modules/events/events.service';
import { OrganizerEventsController } from '../src/modules/events/organizer-events.controller';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { UsersService } from '../src/modules/users/users.service';

describe('Events Integration / E2E', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const mockOrganizer1 = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Organizer One',
    email: 'organizer1@elite.dev',
    role: UserRole.ORGANIZER,
  };

  const mockOrganizer2 = {
    id: '99999999-9999-9999-9999-999999999999',
    name: 'Organizer Two',
    email: 'organizer2@elite.dev',
    role: UserRole.ORGANIZER,
  };

  const mockCustomer = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Customer One',
    email: 'customer1@elite.dev',
    role: UserRole.CUSTOMER,
  };

  const eventsDb = new Map<string, Event>();

  const mockEventsRepository = {
    create: jest.fn((dto: Partial<Event>) => {
      const id = `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const entity = {
        id,
        status: EventStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...dto,
      } as Event;
      return entity;
    }),
    save: jest.fn((event: Event) => {
      eventsDb.set(event.id, { ...event, updatedAt: new Date() });
      return Promise.resolve({ ...event });
    }),
    findOne: jest.fn(({ where }: { where: Record<string, unknown> }) => {
      for (const e of eventsDb.values()) {
        let match = true;
        if (where.id && e.id !== where.id) match = false;
        if (where.status && e.status !== where.status) match = false;
        if (where.organizerId && e.organizerId !== where.organizerId)
          match = false;
        if (match) return Promise.resolve({ ...e });
      }
      return Promise.resolve(null);
    }),
    findAndCount: jest.fn(
      ({
        where,
        skip = 0,
        take = 20,
      }: {
        where: Record<string, unknown>;
        skip?: number;
        take?: number;
      }) => {
        let list = Array.from(eventsDb.values());
        if (where.organizerId) {
          list = list.filter((e) => e.organizerId === where.organizerId);
        }
        if (where.status) {
          list = list.filter((e) => e.status === where.status);
        }
        const total = list.length;
        const paged = list.slice(skip, skip + take);
        return Promise.resolve([paged, total]);
      },
    ),
  };

  const mockUsersService = {
    findById: jest.fn((id: string) => {
      if (id === mockOrganizer1.id) return Promise.resolve(mockOrganizer1);
      if (id === mockOrganizer2.id) return Promise.resolve(mockOrganizer2);
      if (id === mockCustomer.id) return Promise.resolve(mockCustomer);
      return Promise.resolve(null);
    }),
  };

  beforeEach(async () => {
    eventsDb.clear();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-secret-key-for-events-e2e',
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
      controllers: [EventsController, OrganizerEventsController],
      providers: [
        EventsService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: getRepositoryToken(Event),
          useValue: mockEventsRepository,
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

  interface EventTestResponse {
    id: string;
    organizerId: string;
    externalCatalogId: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    startsAt: string;
    location: string;
    capacity: number;
    price: string;
    status: EventStatus;
    availableTickets?: number;
  }

  interface ApiErrorTestResponse {
    statusCode: number;
    code: string;
    message?: string;
  }

  interface PaginatedEventsTestResponse {
    items: EventTestResponse[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  }

  describe('Event Lifecycle & RBAC', () => {
    it('should allow ORGANIZER to create a draft event and return 201', async () => {
      const token = await jwtService.signAsync({
        sub: mockOrganizer1.id,
        role: mockOrganizer1.role,
      });

      const futureDate = new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 10,
      ).toISOString();

      const response = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          externalCatalogId: '157336',
          title: 'Interstellar',
          description: 'A team of explorers...',
          imageUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
          startsAt: futureDate,
          location: 'Cine Elite - Sala 1',
          capacity: 120,
          price: '45.90',
        })
        .expect(201);

      const body = response.body as EventTestResponse;
      expect(body).toHaveProperty('id');
      expect(body.status).toBe(EventStatus.DRAFT);
      expect(body.organizerId).toBe(mockOrganizer1.id);
      expect(body.title).toBe('Interstellar');
      expect(body.capacity).toBe(120);
      expect(body.price).toBe('45.90');
    });

    it('should reject event creation by CUSTOMER with 403 FORBIDDEN', async () => {
      const token = await jwtService.signAsync({
        sub: mockCustomer.id,
        role: mockCustomer.role,
      });

      await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          externalCatalogId: '157336',
          title: 'Interstellar',
          startsAt: new Date(Date.now() + 100000).toISOString(),
          location: 'Cine Elite',
          capacity: 100,
          price: '50.00',
        })
        .expect(403);
    });

    it('should allow owner to update draft event, and reject other organizer with 403', async () => {
      const token1 = await jwtService.signAsync({
        sub: mockOrganizer1.id,
        role: mockOrganizer1.role,
      });

      const token2 = await jwtService.signAsync({
        sub: mockOrganizer2.id,
        role: mockOrganizer2.role,
      });

      const futureDate = new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 10,
      ).toISOString();

      const createRes = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          externalCatalogId: '157336',
          title: 'Interstellar',
          startsAt: futureDate,
          location: 'Cine Elite - Sala 1',
          capacity: 120,
          price: '45.90',
        })
        .expect(201);

      const createBody = createRes.body as EventTestResponse;
      const eventId = createBody.id;

      // Other organizer attempts update
      const rejectRes = await request(app.getHttpServer())
        .patch(`/api/v1/events/${eventId}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ location: 'Hacked Location' })
        .expect(403);

      const rejectBody = rejectRes.body as ApiErrorTestResponse;
      expect(rejectBody.code).toBe('EVENT_NOT_OWNED_BY_ORGANIZER');

      // Owner updates draft
      const updateRes = await request(app.getHttpServer())
        .patch(`/api/v1/events/${eventId}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ location: 'Cine Elite - Sala 2', capacity: 150 })
        .expect(200);

      const updateBody = updateRes.body as EventTestResponse;
      expect(updateBody.location).toBe('Cine Elite - Sala 2');
      expect(updateBody.capacity).toBe(150);
    });

    it('should publish draft event, reject re-publishing with 409, and reject edits after publishing with 409', async () => {
      const token = await jwtService.signAsync({
        sub: mockOrganizer1.id,
        role: mockOrganizer1.role,
      });

      const futureDate = new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 10,
      ).toISOString();

      const createRes = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          externalCatalogId: '157336',
          title: 'Interstellar',
          startsAt: futureDate,
          location: 'Cine Elite - Sala 1',
          capacity: 120,
          price: '45.90',
        })
        .expect(201);

      const createBody = createRes.body as EventTestResponse;
      const eventId = createBody.id;

      // Publish event
      const pubRes = await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(pubRes.body).toEqual({
        id: eventId,
        status: EventStatus.PUBLISHED,
        published: true,
      });

      // Duplicate publish returns 409
      const dupPubRes = await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      const dupPubBody = dupPubRes.body as ApiErrorTestResponse;
      expect(dupPubBody.code).toBe('EVENT_ALREADY_PUBLISHED');

      // Modifying published event returns 409
      const editPubRes = await request(app.getHttpServer())
        .patch(`/api/v1/events/${eventId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ location: 'New Location' })
        .expect(409);

      const editPubBody = editPubRes.body as ApiErrorTestResponse;
      expect(editPubBody.code).toBe('EVENT_ALREADY_PUBLISHED');
    });

    it('should only show published events in public discovery, never draft events', async () => {
      const token = await jwtService.signAsync({
        sub: mockOrganizer1.id,
        role: mockOrganizer1.role,
      });

      const futureDate = new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 10,
      ).toISOString();

      // Create Draft 1
      const draftRes = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          externalCatalogId: '100',
          title: 'Draft Event',
          startsAt: futureDate,
          location: 'Cine Elite',
          capacity: 100,
          price: '30.00',
        })
        .expect(201);

      const draftBody = draftRes.body as EventTestResponse;

      // Create and publish Event 2
      const pubRes = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          externalCatalogId: '200',
          title: 'Published Event',
          startsAt: futureDate,
          location: 'Cine Elite',
          capacity: 200,
          price: '50.00',
        })
        .expect(201);

      const pubBody = pubRes.body as EventTestResponse;

      await request(app.getHttpServer())
        .post(`/api/v1/events/${pubBody.id}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Public list should only contain published event
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/events')
        .expect(200);

      const listBody = listRes.body as PaginatedEventsTestResponse;
      expect(listBody.items).toHaveLength(1);
      expect(listBody.items[0].id).toBe(pubBody.id);
      expect(listBody.items[0].availableTickets).toBe(200);

      // Public detail on draft should return 404
      await request(app.getHttpServer())
        .get(`/api/v1/events/${draftBody.id}`)
        .expect(404);

      // Public detail on published event should return 200
      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/events/${pubBody.id}`)
        .expect(200);

      const detailBody = detailRes.body as EventTestResponse;
      expect(detailBody.id).toBe(pubBody.id);
      expect(detailBody.availableTickets).toBe(200);
    });
  });
});
