import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
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
import { ProcessPaymentResponseDto } from './dto/payment-response.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('reservations/:reservationId/payment')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Process payment simulation for a pending reservation',
    description:
      'Executes simulated payment. On APPROVE, verifies capacity with pessimistic lock and issues N tickets atomically.',
  })
  @ApiParam({ name: 'reservationId', description: 'Reservation UUID' })
  @ApiResponse({
    status: 200,
    description: 'Payment processed successfully (APPROVED or DECLINED)',
    type: ProcessPaymentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error in request body (VALIDATION_ERROR)',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - reservation not owned by customer (RESERVATION_NOT_OWNED_BY_CUSTOMER)',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Reservation not found (RESERVATION_NOT_FOUND)',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - already paid, not payable, or capacity exceeded (RESERVATION_ALREADY_PAID, RESERVATION_NOT_PAYABLE, EVENT_SOLD_OUT)',
    type: ApiErrorResponseDto,
  })
  processPayment(
    @CurrentUser() user: jwtStrategy.AuthenticatedUser,
    @Param('reservationId') reservationId: string,
    @Body() processDto: ProcessPaymentDto,
  ): Promise<ProcessPaymentResponseDto> {
    return this.paymentsService.processPayment(
      user.id,
      reservationId,
      processDto,
    );
  }
}
