import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

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
    findOne: jest.fn(),
    findAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(Event),
          useValue: mockRepository,
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
    it('should create an event in DRAFT status and set organizerId', async () => {
      const dto: CreateEventDto = {
        externalCatalogId: '157336',
        title: 'Interstellar',
        description: 'A team of explorers...',
        imageUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
        startsAt: futureDate.toISOString(),
        location: 'Cine Elite - Sala 1',
        capacity: 120,
        price: '45.90',
      };

      mockRepository.create.mockReturnValue(mockEvent);
      mockRepository.save.mockResolvedValue(mockEvent);

      const result = await service.create(mockOrganizerId, dto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizerId: mockOrganizerId,
          status: EventStatus.DRAFT,
          title: 'Interstellar',
          capacity: 120,
          price: '45.90',
        }),
      );
      expect(mockRepository.save).toHaveBeenCalledWith(mockEvent);
      expect(result).toEqual(mockEvent);
    });
  });

  describe('updateDraft', () => {
    it('should update draft event when user is the owner', async () => {
      const dto: UpdateEventDto = {
        location: 'Cine Elite - Sala 2',
        capacity: 150,
      };

      const existingDraft = { ...mockEvent };
      mockRepository.findOne.mockResolvedValue(existingDraft);
      mockRepository.save.mockImplementation((e) => Promise.resolve(e));

      const result = await service.updateDraft(
        mockOrganizerId,
        mockEvent.id,
        dto,
      );

      expect(result.location).toBe('Cine Elite - Sala 2');
      expect(result.capacity).toBe(150);
    });

    it('should throw 404 EVENT_NOT_FOUND if event does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateDraft(mockOrganizerId, 'unknown-id', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw 403 EVENT_NOT_OWNED_BY_ORGANIZER if event belongs to another organizer', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockEvent,
        organizerId: otherOrganizerId,
      });

      await expect(
        service.updateDraft(mockOrganizerId, mockEvent.id, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw 409 EVENT_ALREADY_PUBLISHED if event is already published', async () => {
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
    it('should publish a draft event successfully', async () => {
      const existingDraft = { ...mockEvent, status: EventStatus.DRAFT };
      mockRepository.findOne.mockResolvedValue(existingDraft);
      mockRepository.save.mockResolvedValue({
        ...existingDraft,
        status: EventStatus.PUBLISHED,
      });

      const result = await service.publish(mockOrganizerId, mockEvent.id);

      expect(result).toEqual({
        id: mockEvent.id,
        status: EventStatus.PUBLISHED,
        published: true,
      });
    });

    it('should throw 409 EVENT_ALREADY_PUBLISHED when already published', async () => {
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
    it('should query only published events and project availableTickets', async () => {
      const publishedEvent = {
        ...mockEvent,
        status: EventStatus.PUBLISHED,
      };

      mockRepository.findAndCount.mockResolvedValue([[publishedEvent], 1]);

      const result = await service.findPublicEvents({
        search: 'Interstellar',
        page: 0,
        limit: 0,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          id: publishedEvent.id,
          title: publishedEvent.title,
          availableTickets: publishedEvent.capacity,
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
    it('should return published event details', async () => {
      const publishedEvent = {
        ...mockEvent,
        status: EventStatus.PUBLISHED,
      };
      mockRepository.findOne.mockResolvedValue(publishedEvent);

      const result = await service.findPublicEventById(publishedEvent.id);

      expect(result.id).toBe(publishedEvent.id);
      expect(result.availableTickets).toBe(publishedEvent.capacity);
    });

    it('should throw 404 if event is not found or is still DRAFT', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findPublicEventById('draft-or-missing-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
