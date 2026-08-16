import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiErrorResponseDto } from '../auth/dto/auth-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import * as jwtStrategy from '../auth/strategies/jwt.strategy';
import { UserRole } from '../users/enums/user-role.enum';
import { GateValidationResponseDto } from './dto/gate-validation-response.dto';
import { ValidateTicketDto } from './dto/validate-ticket.dto';
import { GateService } from './gate.service';

@ApiTags('gate')
@Controller('gate')
export class GateController {
  constructor(private readonly gateService: GateService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GATE)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Validate a ticket code at the event gate (Portaria)',
    description:
      'Validates a ticket via QR or manual code input. Guarantees atomic single-use transition (VALID -> USED). Domain outcomes (VALID, INVALID, ALREADY_USED, WRONG_EVENT) return HTTP 200.',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation evaluated successfully',
    type: GateValidationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error in request payload (VALIDATION_ERROR)',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only GATE role permitted',
    type: ApiErrorResponseDto,
  })
  validateTicket(
    @CurrentUser() user: jwtStrategy.AuthenticatedUser,
    @Body() validateDto: ValidateTicketDto,
  ): Promise<GateValidationResponseDto> {
    return this.gateService.validateTicket(user.id, validateDto);
  }
}
