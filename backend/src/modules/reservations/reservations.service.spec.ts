import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Event } from '../events/entities/event.entity';
import { EventStatus } from '../events/enums/event-status.enum';
import { User } from '../users/entities/user.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { Reservation } from './entities/reservation.entity';
import { ReservationStatus } from './enums/reservation-status.enum';
import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  let service: ReservationsService;

  const mockCustomerId = '22222222-2222-2222-2222-222222222222';
  const otherCustomerId = '33333333-3333-3333-3333-333333333333';
  const mockEventId = '11111111-1111-1111-1111-111111111111';

  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days ahead

  const mockPublishedEvent: Event = {
    id: mockEventId,
    organizerId: 'organizer-uuid',
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

  const mockReservation: Reservation = {
    id: 'reservation-uuid-1',
    customerId: mockCustomerId,
    customer: {} as User,
    eventId: mockEventId,
    event: mockPublishedEvent,
    quantity: 2,
    unitPrice: '45.90',
    totalAmount: '91.80',
    status: ReservationStatus.PENDING_PAYMENT,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReservationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockEventRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockReservationRepository,
        },
        {
          provide: getRepositoryToken(Event),
          useValue: mockEventRepository,
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a reservation in PENDING_PAYMENT status with price snapshot and total amount', async () => {
      const dto: CreateReservationDto = {
        eventId: mockEventId,
        quantity: 2,
      };

      mockEventRepository.findOne.mockResolvedValue(mockPublishedEvent);
      mockReservationRepository.create.mockReturnValue(mockReservation);
      mockReservationRepository.save.mockResolvedValue(mockReservation);

      const result = await service.create(mockCustomerId, dto);

      expect(mockReservationRepository.create).toHaveBeenCalledWith({
        customerId: mockCustomerId,
        eventId: mockEventId,
        quantity: 2,
        unitPrice: '45.90',
        totalAmount: '91.80',
        status: ReservationStatus.PENDING_PAYMENT,
      });
      expect(result).toEqual({
        id: mockReservation.id,
        eventId: mockReservation.eventId,
        customerId: mockReservation.customerId,
        quantity: 2,
        unitPrice: '45.90',
        totalAmount: '91.80',
        status: ReservationStatus.PENDING_PAYMENT,
        createdAt: mockReservation.createdAt,
      });
    });

    it('should throw 404 EVENT_NOT_FOUND when event is not found', async () => {
      mockEventRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(mockCustomerId, { eventId: 'missing-id', quantity: 2 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw 409 EVENT_NOT_PUBLISHED when event is in DRAFT status', async () => {
      mockEventRepository.findOne.mockResolvedValue({
        ...mockPublishedEvent,
        status: EventStatus.DRAFT,
      });

      await expect(
        service.create(mockCustomerId, { eventId: mockEventId, quantity: 2 }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw 409 EVENT_ALREADY_STARTED when event start date is in the past', async () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60);
      mockEventRepository.findOne.mockResolvedValue({
        ...mockPublishedEvent,
        startsAt: pastDate,
      });

      await expect(
        service.create(mockCustomerId, { eventId: mockEventId, quantity: 2 }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw 409 EVENT_SOLD_OUT when requested quantity exceeds total capacity', async () => {
      mockEventRepository.findOne.mockResolvedValue({
        ...mockPublishedEvent,
        capacity: 10,
      });

      await expect(
        service.create(mockCustomerId, { eventId: mockEventId, quantity: 15 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should return reservation when owned by customer', async () => {
      mockReservationRepository.findOne.mockResolvedValue(mockReservation);

      const result = await service.findById(mockCustomerId, mockReservation.id);

      expect(result.id).toBe(mockReservation.id);
      expect(result.customerId).toBe(mockCustomerId);
    });

    it('should throw 404 RESERVATION_NOT_FOUND when reservation does not exist', async () => {
      mockReservationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findById(mockCustomerId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw 403 RESERVATION_NOT_OWNED_BY_CUSTOMER when reservation belongs to another customer', async () => {
      mockReservationRepository.findOne.mockResolvedValue({
        ...mockReservation,
        customerId: otherCustomerId,
      });

      await expect(
        service.findById(mockCustomerId, mockReservation.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
