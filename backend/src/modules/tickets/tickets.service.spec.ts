import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Event } from '../events/entities/event.entity';
import { EventStatus } from '../events/enums/event-status.enum';
import { Reservation } from '../reservations/entities/reservation.entity';
import { User } from '../users/entities/user.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketStatus } from './enums/ticket-status.enum';
import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  let service: TicketsService;

  const mockCustomerId = '22222222-2222-2222-2222-222222222222';
  const otherCustomerId = '33333333-3333-3333-3333-333333333333';

  const mockEvent: Event = {
    id: 'event-uuid',
    title: 'Interstellar',
    imageUrl: 'https://image.tmdb.org/poster.jpg',
    startsAt: new Date('2026-09-20T22:00:00.000Z'),
    location: 'Cine Elite',
    capacity: 100,
    price: '45.90',
    organizerId: 'org-1',
    organizer: {} as User,
    externalCatalogId: '157336',
    description: null,
    status: EventStatus.PUBLISHED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTicket: Ticket = {
    id: 'ticket-uuid-1',
    reservationId: 'res-uuid-1',
    reservation: {} as Reservation,
    eventId: mockEvent.id,
    event: mockEvent,
    customerId: mockCustomerId,
    customer: {} as User,
    secureCode: 'secure-token-123',
    shareToken: 'share-token-456',
    status: TicketStatus.VALID,
    validatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTicketRepository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'APP_URL') return 'http://localhost:3000';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockTicketRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findCustomerTickets', () => {
    it('should return paginated tickets for the customer', async () => {
      mockTicketRepository.findAndCount.mockResolvedValue([[mockTicket], 1]);

      const result = await service.findCustomerTickets(mockCustomerId, 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(mockTicket.id);
      expect(result.items[0].status).toBe(TicketStatus.VALID);
      expect(result.items[0].event.title).toBe('Interstellar');
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
      });
    });
  });

  describe('findCustomerTicketById', () => {
    it('should return ticket details with qrPayload and shareUrl', async () => {
      mockTicketRepository.findOne.mockResolvedValue(mockTicket);

      const result = await service.findCustomerTicketById(
        mockCustomerId,
        mockTicket.id,
      );

      expect(result.id).toBe(mockTicket.id);
      expect(result.secureCode).toBe(mockTicket.secureCode);
      expect(result.qrPayload).toBe(mockTicket.secureCode);
      expect(result.shareUrl).toBe(
        `http://localhost:3000/tickets/share/${mockTicket.shareToken}`,
      );
    });

    it('should throw 404 TICKET_NOT_FOUND if ticket does not exist', async () => {
      mockTicketRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findCustomerTicketById(mockCustomerId, 'nonexistent-ticket'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw 403 FORBIDDEN if ticket belongs to another customer', async () => {
      mockTicketRepository.findOne.mockResolvedValue({
        ...mockTicket,
        customerId: otherCustomerId,
      });

      await expect(
        service.findCustomerTicketById(mockCustomerId, mockTicket.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
