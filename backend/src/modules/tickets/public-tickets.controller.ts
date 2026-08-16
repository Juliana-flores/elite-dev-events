import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../auth/dto/auth-response.dto';
import { SharedTicketResponseDto } from './dto/ticket-response.dto';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@Controller('tickets')
export class PublicTicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('share/:shareToken')
  @ApiOperation({
    summary: 'Get public ticket details by shareToken without authentication',
    description:
      'Provides minimal sanitized ticket information and QR payload for attendees using a shared ticket link.',
  })
  @ApiParam({ name: 'shareToken', description: 'Unique random share token' })
  @ApiResponse({
    status: 200,
    description: 'Shared ticket details and QR payload',
    type: SharedTicketResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Ticket not found (TICKET_NOT_FOUND)',
    type: ApiErrorResponseDto,
  })
  findTicketByShareToken(
    @Param('shareToken') shareToken: string,
  ): Promise<SharedTicketResponseDto> {
    return this.ticketsService.findTicketByShareToken(shareToken);
  }
}
