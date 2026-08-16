import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  DataSource,
  EntityManager,
  FindManyOptions,
  FindOneOptions,
} from 'typeorm';

import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { Event } from '../src/modules/events/entities/event.entity';
import { EventStatus } from '../src/modules/events/enums/event-status.enum';
import { ProcessPaymentResponseDto } from '../src/modules/payments/dto/payment-response.dto';
import { Payment } from '../src/modules/payments/entities/payment.entity';
import { PaymentSimulation } from '../src/modules/payments/enums/payment-simulation.enum';
import { PaymentStatus } from '../src/modules/payments/enums/payment-status.enum';
import { PaymentsController } from '../src/modules/payments/payments.controller';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { FakePaymentProvider } from '../src/modules/payments/providers/fake-payment.provider';
import { PAYMENT_PROVIDER } from '../src/modules/payments/providers/payment-provider.interface';
import { Reservation } from '../src/modules/reservations/entities/reservation.entity';
import { ReservationStatus } from '../src/modules/reservations/enums/reservation-status.enum';
import { PaginatedCustomerTicketsResponseDto } from '../src/modules/tickets/dto/ticket-response.dto';
import { Ticket } from '../src/modules/tickets/entities/ticket.entity';
import { TicketStatus } from '../src/modules/tickets/enums/ticket-status.enum';
import { TicketsController } from '../src/modules/tickets/tickets.controller';
import { TicketsService } from '../src/modules/tickets/tickets.service';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { UsersService } from '../src/modules/users/users.service';

interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message?: string;
}

describe('Payments and Tickets Integration / E2E', () => {
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

  const mockEvent: Event = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    organizerId: 'org-uuid',
    organizer: {} as User,
    externalCatalogId: '157336',
    title: 'Interstellar',
    description: 'Description',
    imageUrl: 'https://image.tmdb.org/poster.jpg',
    startsAt: new Date(Date.now() + 10000000),
    location: 'Cine Elite',
    capacity: 2, // capacity = 2 for testing concurrency & overselling
    price: '45.90',
    status: EventStatus.PUBLISHED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const reservationsDb = new Map<string, Reservation>();
  const paymentsDb = new Map<string, Payment>();
  const ticketsDb = new Map<string, Ticket>();

  // In-memory serialized lock simulation for e2e test
  let isLocked = false;
  const waitLock = async () => {
    while (isLocked) {
      await new Promise((r) => setTimeout(r, 10));
    }
    isLocked = true;
  };
  const releaseLock = () => {
    isLocked = false;
  };

  const mockDataSource = {
    transaction: jest.fn(
      async (
        callback: (
          manager: EntityManager,
        ) => Promise<ProcessPaymentResponseDto>,
      ) => {
        await waitLock();
        try {
          const transactionalManager = {
            getRepository: (entity: unknown) => {
              if (entity === Event) {
                return {
                  createQueryBuilder: () => ({
                    setLock: () => ({
                      where: () => ({
                        getOne: () => Promise.resolve({ ...mockEvent }),
                      }),
                    }),
                  }),
                };
              }
              if (entity === Ticket) {
                return {
                  count: ({ where }: { where: { eventId: string } }) => {
                    const validCount = Array.from(ticketsDb.values()).filter(
                      (t) =>
                        t.eventId === where.eventId &&
                        (t.status === TicketStatus.VALID ||
                          t.status === TicketStatus.USED),
                    ).length;
                    return Promise.resolve(validCount);
                  },
                  create: (dto: Partial<Ticket>) =>
                    ({
                      id: `ticket-${Date.now()}-${Math.random()}`,
                      ...dto,
                    }) as Ticket,
                  save: (tickets: Ticket[]) => {
                    tickets.forEach((t) => ticketsDb.set(t.id, t));
                    return Promise.resolve(tickets);
                  },
                };
              }
              if (entity === Payment) {
                return {
                  create: (dto: Partial<Payment>) =>
                    ({
                      id: `pay-${Date.now()}-${Math.random()}`,
                      ...dto,
                    }) as Payment,
                  save: (payment: Payment) => {
                    paymentsDb.set(payment.id, payment);
                    return Promise.resolve(payment);
                  },
                };
              }
              if (entity === Reservation) {
                return {
                  save: (res: Reservation) => {
                    reservationsDb.set(res.id, { ...res });
                    return Promise.resolve(res);
                  },
                };
              }
              return {};
            },
          };
          return await callback(
            transactionalManager as unknown as EntityManager,
          );
        } finally {
          releaseLock();
        }
      },
    ),
  };

  const mockReservationsRepository = {
    findOne: jest.fn(({ where }: { where: Record<string, unknown> }) => {
      const res = reservationsDb.get(where.id as string);
      return Promise.resolve(res ? { ...res } : null);
    }),
    save: jest.fn((res: Reservation) => {
      reservationsDb.set(res.id, { ...res });
      return Promise.resolve(res);
    }),
  };

  const mockPaymentsRepository = {
    create: jest.fn((dto: Partial<Payment>) => ({
      id: `pay-${Date.now()}-${Math.random()}`,
      ...dto,
    })),
    save: jest.fn((p: Payment) => {
      paymentsDb.set(p.id, p);
      return Promise.resolve(p);
    }),
  };

  const mockTicketsRepository = {
    findAndCount: jest.fn(
      ({
        where,
        skip = 0,
        take = 20,
      }: FindManyOptions<Ticket> & { where: { customerId: string } }) => {
        const list = Array.from(ticketsDb.values())
          .filter((t) => t.customerId === where.customerId)
          .map((t) => ({ ...t, event: mockEvent }));
        return Promise.resolve([list.slice(skip, skip + take), list.length]);
      },
    ),
    findOne: jest.fn(
      ({ where }: FindOneOptions<Ticket> & { where: { id: string } }) => {
        const ticket = ticketsDb.get(where.id);
        if (ticket) return Promise.resolve({ ...ticket, event: mockEvent });
        return Promise.resolve(null);
      },
    ),
  };

  const mockUsersService = {
    findById: jest.fn((id: string) => {
      if (id === mockCustomer1.id) return Promise.resolve(mockCustomer1);
      if (id === mockCustomer2.id) return Promise.resolve(mockCustomer2);
      return Promise.resolve(null);
    }),
  };

  beforeEach(async () => {
    reservationsDb.clear();
    paymentsDb.clear();
    ticketsDb.clear();
    isLocked = false;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-secret-key-for-payments-e2e',
              JWT_EXPIRES_IN: '1d',
              APP_URL: 'http://localhost:3000',
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
      controllers: [PaymentsController, TicketsController],
      providers: [
        PaymentsService,
        TicketsService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: PAYMENT_PROVIDER,
          useClass: FakePaymentProvider,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentsRepository,
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockReservationsRepository,
        },
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockTicketsRepository,
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

  describe('Payment Simulation & Ticket Issuance', () => {
    it('should approve payment, transition reservation to PAID, and issue N tickets', async () => {
      const token = await jwtService.signAsync({
        sub: mockCustomer1.id,
        role: mockCustomer1.role,
      });

      const reservationId = 'res-approved-1';
      reservationsDb.set(reservationId, {
        id: reservationId,
        customerId: mockCustomer1.id,
        eventId: mockEvent.id,
        quantity: 2,
        unitPrice: '45.90',
        totalAmount: '91.80',
        status: ReservationStatus.PENDING_PAYMENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Reservation);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/reservations/${reservationId}/payment`)
        .set('Authorization', `Bearer ${token}`)
        .send({ simulation: PaymentSimulation.APPROVE })
        .expect(200);

      const body = response.body as ProcessPaymentResponseDto;
      expect(body.reservation.status).toBe(ReservationStatus.PAID);
      expect(body.payment.status).toBe(PaymentStatus.APPROVED);
      expect(body.tickets).toHaveLength(2);
      expect(ticketsDb.size).toBe(2);

      // Verify tickets can be listed via GET /me/tickets
      const ticketsRes = await request(app.getHttpServer())
        .get('/api/v1/me/tickets')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ticketsBody =
        ticketsRes.body as PaginatedCustomerTicketsResponseDto;
      expect(ticketsBody.items).toHaveLength(2);
      expect(ticketsBody.items[0].status).toBe(TicketStatus.VALID);
      expect(ticketsBody.items[0].event.title).toBe('Interstellar');
    });

    it('should decline payment, transition reservation to PAYMENT_FAILED, and issue 0 tickets', async () => {
      const token = await jwtService.signAsync({
        sub: mockCustomer1.id,
        role: mockCustomer1.role,
      });

      const reservationId = 'res-declined-1';
      reservationsDb.set(reservationId, {
        id: reservationId,
        customerId: mockCustomer1.id,
        eventId: mockEvent.id,
        quantity: 2,
        unitPrice: '45.90',
        totalAmount: '91.80',
        status: ReservationStatus.PENDING_PAYMENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Reservation);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/reservations/${reservationId}/payment`)
        .set('Authorization', `Bearer ${token}`)
        .send({ simulation: PaymentSimulation.DECLINE })
        .expect(200);

      const body = response.body as ProcessPaymentResponseDto;
      expect(body.reservation.status).toBe(ReservationStatus.PAYMENT_FAILED);
      expect(body.payment.status).toBe(PaymentStatus.DECLINED);
      expect(body.tickets).toHaveLength(0);
      expect(ticketsDb.size).toBe(0);
    });

    it('should reject repeated payment on already PAID reservation with 409 RESERVATION_ALREADY_PAID', async () => {
      const token = await jwtService.signAsync({
        sub: mockCustomer1.id,
        role: mockCustomer1.role,
      });

      const reservationId = 'res-already-paid';
      reservationsDb.set(reservationId, {
        id: reservationId,
        customerId: mockCustomer1.id,
        eventId: mockEvent.id,
        quantity: 2,
        unitPrice: '45.90',
        totalAmount: '91.80',
        status: ReservationStatus.PAID,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Reservation);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/reservations/${reservationId}/payment`)
        .set('Authorization', `Bearer ${token}`)
        .send({ simulation: PaymentSimulation.APPROVE })
        .expect(409);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe('RESERVATION_ALREADY_PAID');
    });

    it('should handle concurrent checkout attempts without overselling event capacity', async () => {
      const token1 = await jwtService.signAsync({
        sub: mockCustomer1.id,
        role: mockCustomer1.role,
      });

      const token2 = await jwtService.signAsync({
        sub: mockCustomer2.id,
        role: mockCustomer2.role,
      });

      const res1 = 'res-concurrent-1';
      const res2 = 'res-concurrent-2';

      // Both customers have a pending reservation for 2 tickets on an event with capacity = 2
      reservationsDb.set(res1, {
        id: res1,
        customerId: mockCustomer1.id,
        eventId: mockEvent.id,
        quantity: 2,
        unitPrice: '45.90',
        totalAmount: '91.80',
        status: ReservationStatus.PENDING_PAYMENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Reservation);

      reservationsDb.set(res2, {
        id: res2,
        customerId: mockCustomer2.id,
        eventId: mockEvent.id,
        quantity: 2,
        unitPrice: '45.90',
        totalAmount: '91.80',
        status: ReservationStatus.PENDING_PAYMENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Reservation);

      // Execute simultaneous concurrent payments
      const [req1, req2] = await Promise.all([
        request(app.getHttpServer())
          .post(`/api/v1/reservations/${res1}/payment`)
          .set('Authorization', `Bearer ${token1}`)
          .send({ simulation: PaymentSimulation.APPROVE }),
        request(app.getHttpServer())
          .post(`/api/v1/reservations/${res2}/payment`)
          .set('Authorization', `Bearer ${token2}`)
          .send({ simulation: PaymentSimulation.APPROVE }),
      ]);

      const statuses = [req1.status, req2.status];
      expect(statuses).toContain(200);
      expect(statuses).toContain(409);

      // Exactly 2 tickets exist in total, never exceeding capacity
      expect(ticketsDb.size).toBe(2);
      expect(ticketsDb.size).toBeLessThanOrEqual(mockEvent.capacity);
    });
  });
});
