import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, EntityManager } from 'typeorm';

import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { Event } from '../src/modules/events/entities/event.entity';
import { EventStatus } from '../src/modules/events/enums/event-status.enum';
import { GateValidationResponseDto } from '../src/modules/gate/dto/gate-validation-response.dto';
import { GateValidationResult } from '../src/modules/gate/enums/gate-validation-result.enum';
import { GateController } from '../src/modules/gate/gate.controller';
import { GateService } from '../src/modules/gate/gate.service';
import { Ticket } from '../src/modules/tickets/entities/ticket.entity';
import { TicketStatus } from '../src/modules/tickets/enums/ticket-status.enum';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { UsersService } from '../src/modules/users/users.service';

describe('Gate Validation Integration / E2E', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const mockGateUser = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Gate User',
    email: 'gate@elite.dev',
    role: UserRole.GATE,
  };

  const mockCustomerUser = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Customer One',
    email: 'customer1@elite.dev',
    role: UserRole.CUSTOMER,
  };

  const mockOrganizerUser = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Organizer One',
    email: 'organizer@elite.dev',
    role: UserRole.ORGANIZER,
  };

  const mockEvent1: Event = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    title: 'Interstellar Premiere',
    organizerId: '11111111-1111-1111-1111-111111111111',
    organizer: {} as User,
    externalCatalogId: '157336',
    description: null,
    imageUrl: null,
    startsAt: new Date(Date.now() + 1000000),
    location: 'Cine Elite - Sala 1',
    capacity: 100,
    price: '50.00',
    status: EventStatus.PUBLISHED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEvent2: Event = {
    ...mockEvent1,
    id: '550e8400-e29b-41d4-a716-446655440002',
    title: 'Oppenheimer Screening',
  };

  const ticketsDb = new Map<string, Ticket>();

  // In-memory serialized locking for concurrency simulation
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
        ) => Promise<GateValidationResponseDto>,
      ) => {
        await waitLock();
        try {
          const transactionalManager = {
            getRepository: (entity: unknown) => {
              if (entity === Ticket) {
                return {
                  createQueryBuilder: () => {
                    let searchCode = '';
                    const builder = {
                      setLock: () => builder,
                      leftJoinAndSelect: () => builder,
                      where: (_clause: string, params: { code: string }) => {
                        searchCode = params.code;
                        return builder;
                      },
                      getOne: () => {
                        const ticket = Array.from(ticketsDb.values()).find(
                          (t) => t.secureCode === searchCode,
                        );
                        if (!ticket) return Promise.resolve(null);
                        const event =
                          ticket.eventId === mockEvent1.id
                            ? mockEvent1
                            : mockEvent2;
                        return Promise.resolve({ ...ticket, event });
                      },
                    };
                    return builder;
                  },
                };
              }
              return {};
            },
            save: (_entity: unknown, ticket: Ticket) => {
              ticketsDb.set(ticket.id, { ...ticket });
              return Promise.resolve({ ...ticket });
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

  const mockUsersService = {
    findById: jest.fn((id: string) => {
      if (id === mockGateUser.id) return Promise.resolve(mockGateUser);
      if (id === mockCustomerUser.id) return Promise.resolve(mockCustomerUser);
      if (id === mockOrganizerUser.id)
        return Promise.resolve(mockOrganizerUser);
      return Promise.resolve(null);
    }),
  };

  beforeEach(async () => {
    ticketsDb.clear();
    isLocked = false;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-secret-key-for-gate-e2e',
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
      controllers: [GateController],
      providers: [
        GateService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: getRepositoryToken(Ticket),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Event),
          useValue: {},
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

  describe('Gate Ticket Validation Flow & Concurrency', () => {
    it('should validate valid ticket and return VALID, transitioning status to USED with validatedAt', async () => {
      const token = await jwtService.signAsync({
        sub: mockGateUser.id,
        role: mockGateUser.role,
      });

      const ticketId = '550e8400-e29b-41d4-a716-446655440010';
      const secureCode = 'sec-123456';
      ticketsDb.set(ticketId, {
        id: ticketId,
        reservationId: '550e8400-e29b-41d4-a716-446655440020',
        eventId: mockEvent1.id,
        customerId: mockCustomerUser.id,
        secureCode,
        shareToken: 'share-1',
        status: TicketStatus.VALID,
        validatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Ticket);

      const response = await request(app.getHttpServer())
        .post('/api/v1/gate/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: mockEvent1.id,
          code: secureCode,
        })
        .expect(200);

      const body = response.body as GateValidationResponseDto;
      expect(body.result).toBe(GateValidationResult.VALID);
      expect(body.ticket?.status).toBe(TicketStatus.USED);
      expect(body.ticket?.validatedAt).toBeDefined();
      expect(body.event?.title).toBe(mockEvent1.title);

      const updatedTicket = ticketsDb.get(ticketId);
      expect(updatedTicket?.status).toBe(TicketStatus.USED);
      expect(updatedTicket?.validatedAt).toBeDefined();
    });

    it('should return ALREADY_USED on subsequent validation of the same ticket', async () => {
      const token = await jwtService.signAsync({
        sub: mockGateUser.id,
        role: mockGateUser.role,
      });

      const ticketId = '550e8400-e29b-41d4-a716-446655440011';
      const secureCode = 'sec-already-used';
      const initialValidatedAt = new Date('2026-08-16T10:00:00.000Z');
      ticketsDb.set(ticketId, {
        id: ticketId,
        reservationId: '550e8400-e29b-41d4-a716-446655440021',
        eventId: mockEvent1.id,
        customerId: mockCustomerUser.id,
        secureCode,
        shareToken: 'share-2',
        status: TicketStatus.USED,
        validatedAt: initialValidatedAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Ticket);

      const response = await request(app.getHttpServer())
        .post('/api/v1/gate/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: mockEvent1.id,
          code: secureCode,
        })
        .expect(200);

      const body = response.body as GateValidationResponseDto;
      expect(body.result).toBe(GateValidationResult.ALREADY_USED);
      expect(body.ticket?.id).toBe(ticketId);
    });

    it('should return INVALID for unknown ticket code', async () => {
      const token = await jwtService.signAsync({
        sub: mockGateUser.id,
        role: mockGateUser.role,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/gate/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: mockEvent1.id,
          code: 'nonexistent-code',
        })
        .expect(200);

      const body = response.body as GateValidationResponseDto;
      expect(body.result).toBe(GateValidationResult.INVALID);
    });

    it('should return WRONG_EVENT when ticket belongs to another event', async () => {
      const token = await jwtService.signAsync({
        sub: mockGateUser.id,
        role: mockGateUser.role,
      });

      const ticketId = '550e8400-e29b-41d4-a716-446655440012';
      const secureCode = 'sec-for-event-2';
      ticketsDb.set(ticketId, {
        id: ticketId,
        reservationId: '550e8400-e29b-41d4-a716-446655440022',
        eventId: mockEvent2.id, // Belongs to Event 2
        customerId: mockCustomerUser.id,
        secureCode,
        shareToken: 'share-3',
        status: TicketStatus.VALID,
        validatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Ticket);

      const response = await request(app.getHttpServer())
        .post('/api/v1/gate/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: mockEvent1.id, // Checking at Event 1 gate
          code: secureCode,
        })
        .expect(200);

      const body = response.body as GateValidationResponseDto;
      expect(body.result).toBe(GateValidationResult.WRONG_EVENT);
      expect(body.ticket?.id).toBe(ticketId);
    });

    it('should reject CUSTOMER or ORGANIZER attempts with 403 FORBIDDEN', async () => {
      const customerToken = await jwtService.signAsync({
        sub: mockCustomerUser.id,
        role: mockCustomerUser.role,
      });

      const organizerToken = await jwtService.signAsync({
        sub: mockOrganizerUser.id,
        role: mockOrganizerUser.role,
      });

      await request(app.getHttpServer())
        .post('/api/v1/gate/validate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ eventId: mockEvent1.id, code: 'any-code' })
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/v1/gate/validate')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ eventId: mockEvent1.id, code: 'any-code' })
        .expect(403);
    });

    it('should handle concurrent validation attempts of the same ticket without dual VALID results', async () => {
      const token1 = await jwtService.signAsync({
        sub: mockGateUser.id,
        role: mockGateUser.role,
      });

      const token2 = await jwtService.signAsync({
        sub: mockGateUser.id,
        role: mockGateUser.role,
      });

      const ticketId = '550e8400-e29b-41d4-a716-446655440013';
      const secureCode = 'sec-concurrent-code';
      ticketsDb.set(ticketId, {
        id: ticketId,
        reservationId: '550e8400-e29b-41d4-a716-446655440023',
        eventId: mockEvent1.id,
        customerId: mockCustomerUser.id,
        secureCode,
        shareToken: 'share-concurrent',
        status: TicketStatus.VALID,
        validatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Ticket);

      // Execute 2 concurrent requests validating the same ticket
      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/v1/gate/validate')
          .set('Authorization', `Bearer ${token1}`)
          .send({ eventId: mockEvent1.id, code: secureCode }),
        request(app.getHttpServer())
          .post('/api/v1/gate/validate')
          .set('Authorization', `Bearer ${token2}`)
          .send({ eventId: mockEvent1.id, code: secureCode }),
      ]);

      const results = [
        (res1.body as GateValidationResponseDto).result,
        (res2.body as GateValidationResponseDto).result,
      ];

      // Exactly 1 must be VALID, the other must be ALREADY_USED
      expect(results).toContain(GateValidationResult.VALID);
      expect(results).toContain(GateValidationResult.ALREADY_USED);

      // Ticket must be in USED state
      expect(ticketsDb.get(ticketId)?.status).toBe(TicketStatus.USED);
    });
  });
});
