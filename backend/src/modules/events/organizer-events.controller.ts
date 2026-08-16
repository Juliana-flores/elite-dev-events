import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
import { PaginatedOrganizerEventsResponseDto } from './dto/event-response.dto';
import { QueryOrganizerEventsDto } from './dto/query-organizer-events.dto';
import { EventsService } from './events.service';

@ApiTags('organizer-events')
@Controller('organizer/events')
export class OrganizerEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List events created by the authenticated organizer',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of organizer events',
    type: PaginatedOrganizerEventsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only ORGANIZER role is permitted',
    type: ApiErrorResponseDto,
  })
  findOrganizerEvents(
    @CurrentUser() user: jwtStrategy.AuthenticatedUser,
    @Query() queryDto: QueryOrganizerEventsDto,
  ): Promise<PaginatedOrganizerEventsResponseDto> {
    return this.eventsService.findOrganizerEvents(user.id, queryDto);
  }
}
