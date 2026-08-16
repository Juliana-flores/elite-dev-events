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
import { Reservation } from '../src/modules/reservations/entities/reservation.entity';
import { ReservationStatus } from '../src/modules/reservations/enums/reservation-status.enum';
import { ReservationsController } from '../src/modules/reservations/reservations.controller';
import { ReservationsService } from '../src/modules/reservations/reservations.service';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { UsersService } from '../src/modules/users/users.service';

describe('Reservations Integration / E2E', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const mockCustomer1 = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Customer One',
    email: 'customer1@elite.dev',
    role: UserRole.CUSTOMER,
  };

  const mockCustomer2 = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Customer Two',
    email: 'customer2@elite.dev',
    role: UserRole.CUSTOMER,
  };

  const mockOrganizer = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Organizer One',
    email: 'organizer1@elite.dev',
    role: UserRole.ORGANIZER,
  };

  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  const mockPublishedEvent: Event = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    organizerId: mockOrganizer.id,
    organizer: {} as User,
    externalCatalogId: '157336',
    title: 'Interstellar',
    description: 'Description',
    imageUrl: 'https://image.tmdb.org/poster.jpg',
    startsAt: futureDate,
    location: 'Cine Elite',
    capacity: 100,
    price: '45.90',
    status: EventStatus.PUBLISHED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDraftEvent: Event = {
    ...mockPublishedEvent,
    id: '550e8400-e29b-41d4-a716-446655440001',
    status: EventStatus.DRAFT,
  };

  const mockPastEvent: Event = {
    ...mockPublishedEvent,
    id: '550e8400-e29b-41d4-a716-446655440002',
    startsAt: new Date(Date.now() - 1000 * 60 * 60),
  };

  const reservationsDb = new Map<string, Reservation>();

  const mockReservationsRepository = {
    create: jest.fn((dto: Partial<Reservation>) => {
      const id = `res-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const entity = {
        id,
        status: ReservationStatus.PENDING_PAYMENT,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...dto,
      } as Reservation;
      return entity;
    }),
    save: jest.fn((reservation: Reservation) => {
      reservationsDb.set(reservation.id, {
        ...reservation,
        updatedAt: new Date(),
      });
      return Promise.resolve({ ...reservation });
    }),
    findOne: jest.fn(({ where }: { where: Record<string, unknown> }) => {
      for (const r of reservationsDb.values()) {
        let match = true;
        if (where.id && r.id !== where.id) match = false;
        if (where.customerId && r.customerId !== where.customerId)
          match = false;
        if (match) return Promise.resolve({ ...r });
      }
      return Promise.resolve(null);
    }),
  };

  const mockEventsRepository = {
    findOne: jest.fn(({ where }: { where: Record<string, unknown> }) => {
      if (where.id === mockPublishedEvent.id)
        return Promise.resolve(mockPublishedEvent);
      if (where.id === mockDraftEvent.id)
        return Promise.resolve(mockDraftEvent);
      if (where.id === mockPastEvent.id) return Promise.resolve(mockPastEvent);
      return Promise.resolve(null);
    }),
  };

  const mockUsersService = {
    findById: jest.fn((id: string) => {
      if (id === mockCustomer1.id) return Promise.resolve(mockCustomer1);
      if (id === mockCustomer2.id) return Promise.resolve(mockCustomer2);
      if (id === mockOrganizer.id) return Promise.resolve(mockOrganizer);
      return Promise.resolve(null);
    }),
  };

  beforeEach(async () => {
    reservationsDb.clear();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-secret-key-for-reservations-e2e',
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
      controllers: [ReservationsController],
      providers: [
        ReservationsService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockReservationsRepository,
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

  interface ReservationTestResponse {
    id: string;
    eventId: string;
    customerId: string;
    quantity: number;
    unitPrice: string;
    totalAmount: string;
    status: ReservationStatus;
    createdAt: string;
  }

  interface ApiErrorTestResponse {
    statusCode: number;
    code: string;
    message?: string;
  }

  describe('Reservation Lifecycle & RBAC', () => {
    it('should allow CUSTOMER to create a reservation with accurate price snapshot', async () => {
      const token = await jwtService.signAsync({
        sub: mockCustomer1.id,
        role: mockCustomer1.role,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: mockPublishedEvent.id,
          quantity: 2,
        })
        .expect(201);

      const body = response.body as ReservationTestResponse;
      expect(body).toHaveProperty('id');
      expect(body.eventId).toBe(mockPublishedEvent.id);
      expect(body.customerId).toBe(mockCustomer1.id);
      expect(body.quantity).toBe(2);
      expect(body.unitPrice).toBe('45.90');
      expect(body.totalAmount).toBe('91.80');
      expect(body.status).toBe(ReservationStatus.PENDING_PAYMENT);
    });

    it('should reject reservation creation by ORGANIZER with 403 FORBIDDEN', async () => {
      const token = await jwtService.signAsync({
        sub: mockOrganizer.id,
        role: mockOrganizer.role,
      });

      await request(app.getHttpServer())
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: mockPublishedEvent.id,
          quantity: 1,
        })
        .expect(403);
    });

    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reservations')
        .send({
          eventId: mockPublishedEvent.id,
          quantity: 1,
        })
        .expect(401);
    });

    it('should reject invalid payload (quantity 0) with 400 VALIDATION_ERROR', async () => {
      const token = await jwtService.signAsync({
        sub: mockCustomer1.id,
        role: mockCustomer1.role,
      });

      await request(app.getHttpServer())
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: mockPublishedEvent.id,
          quantity: 0,
        })
        .expect(400);
    });

    it('should reject reservation on DRAFT event with 409 EVENT_NOT_PUBLISHED', async () => {
      const token = await jwtService.signAsync({
        sub: mockCustomer1.id,
        role: mockCustomer1.role,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: mockDraftEvent.id,
          quantity: 1,
        })
        .expect(409);

      const body = response.body as ApiErrorTestResponse;
      expect(body.code).toBe('EVENT_NOT_PUBLISHED');
    });

    it('should reject reservation on past event with 409 EVENT_ALREADY_STARTED', async () => {
      const token = await jwtService.signAsync({
        sub: mockCustomer1.id,
        role: mockCustomer1.role,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: mockPastEvent.id,
          quantity: 1,
        })
        .expect(409);

      const body = response.body as ApiErrorTestResponse;
      expect(body.code).toBe('EVENT_ALREADY_STARTED');
    });

    it('should allow customer to fetch their reservation and reject another customer with 403', async () => {
      const token1 = await jwtService.signAsync({
        sub: mockCustomer1.id,
        role: mockCustomer1.role,
      });

      const token2 = await jwtService.signAsync({
        sub: mockCustomer2.id,
        role: mockCustomer2.role,
      });

      const createRes = await request(app.getHttpServer())
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          eventId: mockPublishedEvent.id,
          quantity: 2,
        })
        .expect(201);

      const reservationId = (createRes.body as ReservationTestResponse).id;

      // Customer 1 fetches their reservation
      const getRes = await request(app.getHttpServer())
        .get(`/api/v1/reservations/${reservationId}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect((getRes.body as ReservationTestResponse).id).toBe(reservationId);

      // Customer 2 tries to fetch Customer 1's reservation
      const rejectRes = await request(app.getHttpServer())
        .get(`/api/v1/reservations/${reservationId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(403);

      expect((rejectRes.body as ApiErrorTestResponse).code).toBe(
        'RESERVATION_NOT_OWNED_BY_CUSTOMER',
      );
    });
  });
});
