import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

import { Event } from '../events/entities/event.entity';
import { EventStatus } from '../events/enums/event-status.enum';
import { Reservation } from '../reservations/entities/reservation.entity';
import { ReservationStatus } from '../reservations/enums/reservation-status.enum';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../tickets/enums/ticket-status.enum';
import { User } from '../users/entities/user.entity';
import { Payment } from './entities/payment.entity';
import { PaymentSimulation } from './enums/payment-simulation.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { PaymentsService } from './payments.service';
import {
  PAYMENT_PROVIDER,
  PaymentProvider,
} from './providers/payment-provider.interface';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentProvider: PaymentProvider;

  const mockCustomerId = '22222222-2222-2222-2222-222222222222';
  const otherCustomerId = '33333333-3333-3333-3333-333333333333';
  const mockEventId = '11111111-1111-1111-1111-111111111111';
  const mockReservationId = '44444444-4444-4444-4444-444444444444';

  const mockEvent: Event = {
    id: mockEventId,
    organizerId: 'organizer-uuid',
    organizer: {} as User,
    externalCatalogId: '157336',
    title: 'Interstellar',
    description: 'Description',
    imageUrl: 'https://image.tmdb.org/poster.jpg',
    startsAt: new Date(Date.now() + 1000000),
    location: 'Cine Elite',
    capacity: 10,
    price: '45.90',
    status: EventStatus.PUBLISHED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPendingReservation: Reservation = {
    id: mockReservationId,
    customerId: mockCustomerId,
    customer: {} as User,
    eventId: mockEventId,
    event: mockEvent,
    quantity: 2,
    unitPrice: '45.90',
    totalAmount: '91.80',
    status: ReservationStatus.PENDING_PAYMENT,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaymentRepository = {
    create: jest.fn((dto: Partial<Payment>) => ({ id: 'pay-1', ...dto })),
    save: jest.fn((payment: Payment) => Promise.resolve(payment)),
    findOne: jest.fn(),
  };

  const mockReservationRepository = {
    findOne: jest.fn(),
    save: jest.fn((res: Reservation) => Promise.resolve(res)),
  };

  const mockQueryBuilder = {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockTransactionalEventRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockTransactionalTicketRepo = {
    count: jest.fn(),
    create: jest.fn((dto: Partial<Ticket>) => ({
      id: `ticket-${Math.random()}`,
      ...dto,
    })),
    save: jest.fn((tickets: Ticket[]) => Promise.resolve(tickets)),
  };

  const mockTransactionalPaymentRepo = {
    create: jest.fn((dto: Partial<Payment>) => ({
      id: 'pay-uuid-approved',
      ...dto,
    })),
    save: jest.fn((p: Payment) => Promise.resolve(p)),
  };

  const mockTransactionalReservationRepo = {
    save: jest.fn((r: Reservation) => Promise.resolve(r)),
  };

  const mockManager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Event) return mockTransactionalEventRepo;
      if (entity === Ticket) return mockTransactionalTicketRepo;
      if (entity === Payment) return mockTransactionalPaymentRepo;
      if (entity === Reservation) return mockTransactionalReservationRepo;
      return {};
    }),
  };

  const mockDataSource = {
    transaction: jest.fn(
      (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback(mockManager as unknown as EntityManager),
    ),
  };

  const mockPaymentProvider = {
    processPayment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockReservationRepository,
        },
        {
          provide: PAYMENT_PROVIDER,
          useValue: mockPaymentProvider,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentProvider = module.get<PaymentProvider>(PAYMENT_PROVIDER);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(paymentProvider).toBeDefined();
  });

  describe('processPayment', () => {
    it('should process DECLINE simulation without issuing tickets', async () => {
      mockReservationRepository.findOne.mockResolvedValue({
        ...mockPendingReservation,
      });
      mockPaymentProvider.processPayment.mockResolvedValue({
        success: false,
        status: PaymentStatus.DECLINED,
        provider: 'FAKE',
      });

      const result = await service.processPayment(
        mockCustomerId,
        mockReservationId,
        { simulation: PaymentSimulation.DECLINE },
      );

      expect(result.reservation.status).toBe(ReservationStatus.PAYMENT_FAILED);
      expect(result.payment.status).toBe(PaymentStatus.DECLINED);
      expect(result.tickets).toHaveLength(0);
    });

    it('should process APPROVE simulation with capacity check and issue N tickets', async () => {
      const reservation = { ...mockPendingReservation, quantity: 2 };
      mockReservationRepository.findOne.mockResolvedValue(reservation);
      mockPaymentProvider.processPayment.mockResolvedValue({
        success: true,
        status: PaymentStatus.APPROVED,
        provider: 'FAKE',
      });

      mockQueryBuilder.getOne.mockResolvedValue(mockEvent);
      mockTransactionalTicketRepo.count.mockResolvedValue(5); // 5 confirmed, capacity 10, wants 2 -> ok!

      const result = await service.processPayment(
        mockCustomerId,
        mockReservationId,
        { simulation: PaymentSimulation.APPROVE },
      );

      expect(result.reservation.status).toBe(ReservationStatus.PAID);
      expect(result.payment.status).toBe(PaymentStatus.APPROVED);
      expect(result.tickets).toHaveLength(2);
      expect(result.tickets[0].status).toBe(TicketStatus.VALID);
      expect(result.tickets[1].status).toBe(TicketStatus.VALID);
    });

    it('should throw 409 EVENT_SOLD_OUT when capacity is exceeded during APPROVE simulation', async () => {
      const reservation = { ...mockPendingReservation, quantity: 4 };
      mockReservationRepository.findOne.mockResolvedValue(reservation);
      mockPaymentProvider.processPayment.mockResolvedValue({
        success: true,
        status: PaymentStatus.APPROVED,
        provider: 'FAKE',
      });

      mockQueryBuilder.getOne.mockResolvedValue({ ...mockEvent, capacity: 10 });
      mockTransactionalTicketRepo.count.mockResolvedValue(8); // 8 + 4 = 12 > 10!

      await expect(
        service.processPayment(mockCustomerId, mockReservationId, {
          simulation: PaymentSimulation.APPROVE,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw 409 RESERVATION_ALREADY_PAID when reservation is already paid', async () => {
      mockReservationRepository.findOne.mockResolvedValue({
        ...mockPendingReservation,
        status: ReservationStatus.PAID,
      });

      await expect(
        service.processPayment(mockCustomerId, mockReservationId, {
          simulation: PaymentSimulation.APPROVE,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw 409 RESERVATION_NOT_PAYABLE when reservation is not pending', async () => {
      mockReservationRepository.findOne.mockResolvedValue({
        ...mockPendingReservation,
        status: ReservationStatus.CANCELLED,
      });

      await expect(
        service.processPayment(mockCustomerId, mockReservationId, {
          simulation: PaymentSimulation.APPROVE,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw 403 when customer is not the reservation owner', async () => {
      mockReservationRepository.findOne.mockResolvedValue({
        ...mockPendingReservation,
        customerId: otherCustomerId,
      });

      await expect(
        service.processPayment(mockCustomerId, mockReservationId, {
          simulation: PaymentSimulation.APPROVE,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw 404 when reservation is not found', async () => {
      mockReservationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.processPayment(mockCustomerId, 'unknown-res-id', {
          simulation: PaymentSimulation.APPROVE,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
