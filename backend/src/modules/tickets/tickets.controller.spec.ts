import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import * as jwtStrategy from '../auth/strategies/jwt.strategy';
import { UserRole } from '../users/enums/user-role.enum';
import { TicketStatus } from './enums/ticket-status.enum';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

describe('TicketsController', () => {
  let controller: TicketsController;

  const mockCustomerUser: jwtStrategy.AuthenticatedUser = {
    id: 'customer-uuid-1',
    email: 'customer1@elite.dev',
    name: 'Customer One',
    role: UserRole.CUSTOMER,
  };

  const mockTicketsList = {
    items: [
      {
        id: 'ticket-1',
        status: TicketStatus.VALID,
        event: {
          id: 'event-1',
          title: 'Interstellar',
          imageUrl: 'https://image.tmdb.org/poster.jpg',
          startsAt: new Date(),
          location: 'Cine Elite',
        },
        createdAt: new Date(),
      },
    ],
    pagination: {
      page: 1,
      limit: 20,
      totalItems: 1,
      totalPages: 1,
    },
  };

  const mockTicketDetail = {
    id: 'ticket-1',
    status: TicketStatus.VALID,
    secureCode: 'secure-token-123',
    shareUrl: 'http://localhost:3000/tickets/share/share-token-456',
    qrPayload: 'secure-token-123',
    validatedAt: null,
    event: {
      id: 'event-1',
      title: 'Interstellar',
      startsAt: new Date(),
      location: 'Cine Elite',
    },
  };

  const mockTicketsService = {
    findCustomerTickets: jest.fn(),
    findCustomerTicketById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        {
          provide: TicketsService,
          useValue: mockTicketsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TicketsController>(TicketsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should find customer tickets', async () => {
    mockTicketsService.findCustomerTickets.mockResolvedValue(mockTicketsList);

    const result = await controller.findCustomerTickets(
      mockCustomerUser,
      1,
      20,
    );

    expect(mockTicketsService.findCustomerTickets).toHaveBeenCalledWith(
      mockCustomerUser.id,
      1,
      20,
    );
    expect(result).toEqual(mockTicketsList);
  });

  it('should find customer ticket by id', async () => {
    mockTicketsService.findCustomerTicketById.mockResolvedValue(
      mockTicketDetail,
    );

    const result = await controller.findCustomerTicketById(
      mockCustomerUser,
      'ticket-1',
    );

    expect(mockTicketsService.findCustomerTicketById).toHaveBeenCalledWith(
      mockCustomerUser.id,
      'ticket-1',
    );
    expect(result).toEqual(mockTicketDetail);
  });
});
