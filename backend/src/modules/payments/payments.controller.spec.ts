import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import * as jwtStrategy from '../auth/strategies/jwt.strategy';
import { ReservationStatus } from '../reservations/enums/reservation-status.enum';
import { TicketStatus } from '../tickets/enums/ticket-status.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { ProcessPaymentResponseDto } from './dto/payment-response.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { PaymentSimulation } from './enums/payment-simulation.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  const mockCustomerUser: jwtStrategy.AuthenticatedUser = {
    id: 'customer-uuid-1',
    email: 'customer1@elite.dev',
    name: 'Customer One',
    role: UserRole.CUSTOMER,
  };

  const mockPaymentResponse: ProcessPaymentResponseDto = {
    reservation: {
      id: 'res-1',
      status: ReservationStatus.PAID,
      quantity: 2,
      totalAmount: '91.80',
    },
    payment: {
      id: 'pay-1',
      status: PaymentStatus.APPROVED,
      provider: 'FAKE',
      amount: '91.80',
    },
    tickets: [
      { id: 'ticket-1', status: TicketStatus.VALID },
      { id: 'ticket-2', status: TicketStatus.VALID },
    ],
  };

  const mockPaymentsService = {
    processPayment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate to paymentsService.processPayment', async () => {
    const dto: ProcessPaymentDto = {
      simulation: PaymentSimulation.APPROVE,
    };

    mockPaymentsService.processPayment.mockResolvedValue(mockPaymentResponse);

    const result = await controller.processPayment(
      mockCustomerUser,
      'res-1',
      dto,
    );

    expect(mockPaymentsService.processPayment).toHaveBeenCalledWith(
      mockCustomerUser.id,
      'res-1',
      dto,
    );
    expect(result).toEqual(mockPaymentResponse);
  });
});
