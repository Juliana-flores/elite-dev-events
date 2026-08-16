import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

import { Event } from '../events/entities/event.entity';
import { EventStatus } from '../events/enums/event-status.enum';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../tickets/enums/ticket-status.enum';
import { User } from '../users/entities/user.entity';
import { GateValidationResult } from './enums/gate-validation-result.enum';
import { GateService } from './gate.service';

describe('GateService', () => {
  let service: GateService;

  const mockGateUserId = 'gate-user-uuid';
  const mockEventId = 'event-uuid-1';
  const otherEventId = 'event-uuid-2';
  const mockSecureCode = 'secure-code-123';

  const mockEvent: Event = {
    id: mockEventId,
    title: 'Interstellar',
    organizerId: 'org-1',
    organizer: {} as User,
    externalCatalogId: '157336',
    description: null,
    imageUrl: null,
    startsAt: new Date(),
    location: 'Cine Elite',
    capacity: 100,
    price: '45.90',
    status: EventStatus.PUBLISHED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockValidTicket: Ticket = {
    id: 'ticket-uuid-1',
    reservationId: 'res-1',
    reservation: {} as Reservation,
    eventId: mockEventId,
    event: mockEvent,
    customerId: 'customer-1',
    customer: {} as User,
    secureCode: mockSecureCode,
    shareToken: 'share-token-123',
    status: TicketStatus.VALID,
    validatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueryBuilder = {
    setLock: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockTransactionalTicketRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockManager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Ticket) return mockTransactionalTicketRepo;
      return {};
    }),
    save: jest.fn((_entity: unknown, ticket: Ticket) =>
      Promise.resolve(ticket),
    ),
  };

  const mockDataSource = {
    transaction: jest.fn(
      (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback(mockManager as unknown as EntityManager),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GateService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<GateService>(GateService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateTicket', () => {
    it('should validate valid ticket and transition to USED with validatedAt', async () => {
      const ticketToValidate = { ...mockValidTicket };
      mockQueryBuilder.getOne.mockResolvedValue(ticketToValidate);

      const result = await service.validateTicket(mockGateUserId, {
        eventId: mockEventId,
        code: mockSecureCode,
      });

      expect(result.result).toBe(GateValidationResult.VALID);
      expect(result.ticket?.status).toBe(TicketStatus.USED);
      expect(result.ticket?.validatedAt).toBeInstanceOf(Date);
      expect(result.event?.title).toBe('Interstellar');
      expect(mockManager.save).toHaveBeenCalledWith(
        Ticket,
        expect.objectContaining({
          id: mockValidTicket.id,
          status: TicketStatus.USED,
        }),
      );
    });

    it('should return INVALID when ticket code is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await service.validateTicket(mockGateUserId, {
        eventId: mockEventId,
        code: 'unknown-code',
      });

      expect(result.result).toBe(GateValidationResult.INVALID);
      expect(mockManager.save).not.toHaveBeenCalled();
    });

    it('should return WRONG_EVENT when ticket belongs to another event', async () => {
      const ticketForOtherEvent = {
        ...mockValidTicket,
        eventId: otherEventId,
      };
      mockQueryBuilder.getOne.mockResolvedValue(ticketForOtherEvent);

      const result = await service.validateTicket(mockGateUserId, {
        eventId: mockEventId,
        code: mockSecureCode,
      });

      expect(result.result).toBe(GateValidationResult.WRONG_EVENT);
      expect(result.ticket?.id).toBe(ticketForOtherEvent.id);
      expect(mockManager.save).not.toHaveBeenCalled();
    });

    it('should return ALREADY_USED when ticket has already been used', async () => {
      const usedDate = new Date();
      const usedTicket = {
        ...mockValidTicket,
        status: TicketStatus.USED,
        validatedAt: usedDate,
      };
      mockQueryBuilder.getOne.mockResolvedValue(usedTicket);

      const result = await service.validateTicket(mockGateUserId, {
        eventId: mockEventId,
        code: mockSecureCode,
      });

      expect(result.result).toBe(GateValidationResult.ALREADY_USED);
      expect(result.ticket?.status).toBe(TicketStatus.USED);
      expect(result.ticket?.validatedAt).toBe(usedDate);
      expect(mockManager.save).not.toHaveBeenCalled();
    });
  });
});
