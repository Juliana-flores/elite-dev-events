import {
  Body,
  Controller,
  Get,
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
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new ticket reservation in PENDING_PAYMENT status',
  })
  @ApiResponse({
    status: 201,
    description: 'Reservation successfully created',
    type: ReservationResponseDto,
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
    description: 'Forbidden - only CUSTOMER role is permitted',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found (EVENT_NOT_FOUND)',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - event not published, already started or sold out (EVENT_NOT_PUBLISHED, EVENT_ALREADY_STARTED, EVENT_SOLD_OUT)',
    type: ApiErrorResponseDto,
  })
  create(
    @CurrentUser() user: jwtStrategy.AuthenticatedUser,
    @Body() createDto: CreateReservationDto,
  ): Promise<ReservationResponseDto> {
    return this.reservationsService.create(user.id, createDto);
  }

  @Get(':reservationId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get details of a reservation owned by authenticated customer',
  })
  @ApiParam({ name: 'reservationId', description: 'Reservation UUID' })
  @ApiResponse({
    status: 200,
    description: 'Reservation details',
    type: ReservationResponseDto,
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
  findById(
    @CurrentUser() user: jwtStrategy.AuthenticatedUser,
    @Param('reservationId') reservationId: string,
  ): Promise<ReservationResponseDto> {
    return this.reservationsService.findById(user.id, reservationId);
  }
}
