import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import * as jwtStrategy from '../auth/strategies/jwt.strategy';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';
import { ReservationStatus } from './enums/reservation-status.enum';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

describe('ReservationsController', () => {
  let controller: ReservationsController;
  let service: ReservationsService;

  const mockCustomerUser: jwtStrategy.AuthenticatedUser = {
    id: 'customer-uuid-1',
    email: 'customer1@elite.dev',
    name: 'Customer One',
    role: UserRole.CUSTOMER,
  };

  const mockReservationResponse: ReservationResponseDto = {
    id: 'reservation-uuid-1',
    eventId: 'event-uuid-1',
    customerId: mockCustomerUser.id,
    quantity: 2,
    unitPrice: '45.90',
    totalAmount: '91.80',
    status: ReservationStatus.PENDING_PAYMENT,
    createdAt: new Date(),
  };

  const mockReservationsService = {
    create: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [
        {
          provide: ReservationsService,
          useValue: mockReservationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReservationsController>(ReservationsController);
    service = module.get<ReservationsService>(ReservationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to reservationsService.create with authenticated user id and dto', async () => {
      const dto: CreateReservationDto = {
        eventId: 'event-uuid-1',
        quantity: 2,
      };

      mockReservationsService.create.mockResolvedValue(mockReservationResponse);

      const result = await controller.create(mockCustomerUser, dto);

      expect(mockReservationsService.create).toHaveBeenCalledWith(
        mockCustomerUser.id,
        dto,
      );
      expect(result).toEqual(mockReservationResponse);
    });
  });

  describe('findById', () => {
    it('should delegate to reservationsService.findById with authenticated user id and reservation id', async () => {
      mockReservationsService.findById.mockResolvedValue(
        mockReservationResponse,
      );

      const result = await controller.findById(
        mockCustomerUser,
        mockReservationResponse.id,
      );

      expect(mockReservationsService.findById).toHaveBeenCalledWith(
        mockCustomerUser.id,
        mockReservationResponse.id,
      );
      expect(result).toEqual(mockReservationResponse);
    });
  });
});
