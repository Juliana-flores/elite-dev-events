import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import * as jwtStrategy from '../auth/strategies/jwt.strategy';
import { TicketStatus } from '../tickets/enums/ticket-status.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { ValidateTicketDto } from './dto/validate-ticket.dto';
import { GateValidationResult } from './enums/gate-validation-result.enum';
import { GateController } from './gate.controller';
import { GateService } from './gate.service';

describe('GateController', () => {
  let controller: GateController;

  const mockGateUser: jwtStrategy.AuthenticatedUser = {
    id: 'gate-user-uuid',
    email: 'gate@elite.dev',
    name: 'Gate Staff',
    role: UserRole.GATE,
  };

  const mockValidationResponse = {
    result: GateValidationResult.VALID,
    ticket: {
      id: 'ticket-uuid-1',
      status: TicketStatus.USED,
      validatedAt: new Date(),
    },
    event: {
      id: 'event-uuid-1',
      title: 'Interstellar',
    },
  };

  const mockGateService = {
    validateTicket: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GateController],
      providers: [
        {
          provide: GateService,
          useValue: mockGateService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GateController>(GateController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate to gateService.validateTicket', async () => {
    const dto: ValidateTicketDto = {
      eventId: 'event-uuid-1',
      code: 'secure-code-123',
    };

    mockGateService.validateTicket.mockResolvedValue(mockValidationResponse);

    const result = await controller.validateTicket(mockGateUser, dto);

    expect(mockGateService.validateTicket).toHaveBeenCalledWith(
      mockGateUser.id,
      dto,
    );
    expect(result).toEqual(mockValidationResponse);
  });
});
