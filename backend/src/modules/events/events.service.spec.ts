import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Reservation } from '../reservations/entities/reservation.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entities/event.entity';
import { EventStatus } from './enums/event-status.enum';
import { EventsService } from './events.service';

describe('EventsService', () => {
  let service: EventsService;

  const mockOrganizerId = '11111111-1111-1111-1111-111111111111';
  const otherOrganizerId = '99999999-9999-9999-9999-999999999999';

  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days ahead

  const mockEvent: Event = {
    id: 'event-uuid-1',
    organizerId: mockOrganizerId,
    organizer: {} as User,
    externalCatalogId: '157336',
    title: 'Interstellar',
    description: 'A team of explorers...',
    imageUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
    startsAt: futureDate,
    location: 'Cine Elite - Sala 1',
    capacity: 120,
    price: '45.90',
    status: EventStatus.DRAFT,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockTicketQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  const mockTicketRepository = {
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn().mockReturnValue(mockTicketQueryBuilder),
  };

  const mockReservationRepository = {
    count: jest.fn().mockResolvedValue(0),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(Event),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockTicketRepository,
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockReservationRepository,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an event in DRAFT status', async () => {
      const createDto: CreateEventDto = {
        externalCatalogId: '157336',
        title: ' Interstellar ',
        description: ' Explorers ',
        imageUrl: ' https://image.tmdb.org/poster.jpg ',
        startsAt: futureDate.toISOString(),
        location: ' Cine Elite ',
        capacity: 120,
        price: '45.90',
      };

      mockRepository.create.mockReturnValue({ ...mockEvent });
      mockRepository.save.mockResolvedValue({ ...mockEvent });

      const result = await service.create(mockOrganizerId, createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizerId: mockOrganizerId,
          title: 'Interstellar',
          price: '45.90',
          status: EventStatus.DRAFT,
        }),
      );
      expect(result.status).toBe(EventStatus.DRAFT);
    });
  });

  describe('updateDraft', () => {
    it('should update draft event when user is owner', async () => {
      const updateDto: UpdateEventDto = {
        location: 'New Location',
        capacity: 150,
      };

      mockRepository.findOne.mockResolvedValue({ ...mockEvent });
      mockRepository.save.mockImplementation((e) => Promise.resolve(e));

      const result = await service.updateDraft(
        mockOrganizerId,
        mockEvent.id,
        updateDto,
      );

      expect(result.location).toBe('New Location');
      expect(result.capacity).toBe(150);
    });

    it('should throw 404 EVENT_NOT_FOUND when event does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateDraft(mockOrganizerId, 'nonexistent', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw 403 EVENT_NOT_OWNED_BY_ORGANIZER when user is not owner', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockEvent });

      await expect(
        service.updateDraft(otherOrganizerId, mockEvent.id, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw 409 EVENT_ALREADY_PUBLISHED when event is not in DRAFT', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockEvent,
        status: EventStatus.PUBLISHED,
      });

      await expect(
        service.updateDraft(mockOrganizerId, mockEvent.id, {}),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('publish', () => {
    it('should transition event from DRAFT to PUBLISHED', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockEvent });
      mockRepository.save.mockImplementation((e) => Promise.resolve(e));

      const result = await service.publish(mockOrganizerId, mockEvent.id);

      expect(result.status).toBe(EventStatus.PUBLISHED);
      expect(result.published).toBe(true);
    });

    it('should throw 409 EVENT_ALREADY_PUBLISHED if event is already published', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockEvent,
        status: EventStatus.PUBLISHED,
      });

      await expect(
        service.publish(mockOrganizerId, mockEvent.id),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw 422 VALIDATION_ERROR when event start date is in the past', async () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24);
      mockRepository.findOne.mockResolvedValue({
        ...mockEvent,
        startsAt: pastDate,
      });

      await expect(
        service.publish(mockOrganizerId, mockEvent.id),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('findPublicEvents', () => {
    it('should query published events and calculate availableTickets taking confirmed tickets into account', async () => {
      const publishedEvent = {
        ...mockEvent,
        capacity: 100,
        status: EventStatus.PUBLISHED,
      };

      mockRepository.findAndCount.mockResolvedValue([[publishedEvent], 1]);
      mockTicketQueryBuilder.getRawMany.mockResolvedValue([
        { eventId: publishedEvent.id, count: '6' },
      ]);

      const result = await service.findPublicEvents({
        search: 'Interstellar',
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          id: publishedEvent.id,
          title: publishedEvent.title,
          capacity: 100,
          availableTickets: 94, // 100 - 6 = 94
          status: EventStatus.PUBLISHED,
        }),
      );
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
      });
    });
  });

  describe('findPublicEventById', () => {
    it('should return published event details with real-time availableTickets', async () => {
      const publishedEvent = {
        ...mockEvent,
        capacity: 100,
        status: EventStatus.PUBLISHED,
      };
      mockRepository.findOne.mockResolvedValue(publishedEvent);
      mockTicketRepository.count.mockResolvedValue(6);

      const result = await service.findPublicEventById(publishedEvent.id);

      expect(result.id).toBe(publishedEvent.id);
      expect(result.capacity).toBe(100);
      expect(result.availableTickets).toBe(94); // 100 - 6 = 94
    });

    it('should throw 404 if event is not found or is still DRAFT', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findPublicEventById('draft-or-missing-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete event when user is owner and there are no tickets or reservations', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockEvent });
      mockTicketRepository.count.mockResolvedValue(0);
      mockReservationRepository.count.mockResolvedValue(0);
      mockRepository.remove.mockResolvedValue({ ...mockEvent });

      await service.delete(mockOrganizerId, mockEvent.id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEvent.id },
      });
      expect(mockTicketRepository.count).toHaveBeenCalledWith({
        where: { eventId: mockEvent.id },
      });
      expect(mockReservationRepository.count).toHaveBeenCalledWith({
        where: { eventId: mockEvent.id },
      });
      expect(mockRepository.remove).toHaveBeenCalledWith(
        expect.objectContaining({ id: mockEvent.id }),
      );
    });

    it('should throw 404 EVENT_NOT_FOUND when event does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.delete(mockOrganizerId, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw 403 EVENT_NOT_OWNED_BY_ORGANIZER when user is not owner', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockEvent });

      await expect(
        service.delete(otherOrganizerId, mockEvent.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw 409 EVENT_CANNOT_BE_DELETED when event has tickets', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockEvent });
      mockTicketRepository.count.mockResolvedValue(3);

      await expect(
        service.delete(mockOrganizerId, mockEvent.id),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw 409 EVENT_CANNOT_BE_DELETED when event has reservations', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockEvent });
      mockTicketRepository.count.mockResolvedValue(0);
      mockReservationRepository.count.mockResolvedValue(2);

      await expect(
        service.delete(mockOrganizerId, mockEvent.id),
      ).rejects.toThrow(ConflictException);
    });
  });
});
