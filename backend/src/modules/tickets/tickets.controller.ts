import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
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
import {
  CustomerTicketDetailDto,
  PaginatedCustomerTicketsResponseDto,
} from './dto/ticket-response.dto';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@Controller('me/tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List tickets owned by authenticated customer (Meus Ingressos)',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of customer tickets',
    type: PaginatedCustomerTicketsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only CUSTOMER role permitted',
    type: ApiErrorResponseDto,
  })
  findCustomerTickets(
    @CurrentUser() user: jwtStrategy.AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedCustomerTicketsResponseDto> {
    return this.ticketsService.findCustomerTickets(user.id, page, limit);
  }

  @Get(':ticketId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get details of a specific ticket including secure QR payload',
  })
  @ApiParam({ name: 'ticketId', description: 'Ticket UUID' })
  @ApiResponse({
    status: 200,
    description: 'Ticket details with QR payload and share URL',
    type: CustomerTicketDetailDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - ticket does not belong to customer',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Ticket not found (TICKET_NOT_FOUND)',
    type: ApiErrorResponseDto,
  })
  findCustomerTicketById(
    @CurrentUser() user: jwtStrategy.AuthenticatedUser,
    @Param('ticketId') ticketId: string,
  ): Promise<CustomerTicketDetailDto> {
    return this.ticketsService.findCustomerTicketById(user.id, ticketId);
  }
}
