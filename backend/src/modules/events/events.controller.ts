import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
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
import { CreateEventDto } from './dto/create-event.dto';
import {
  EventDto,
  PaginatedPublicEventsResponseDto,
  PublicEventDto,
  PublishEventResponseDto,
} from './dto/event-response.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsService } from './events.service';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new event in DRAFT status' })
  @ApiResponse({
    status: 201,
    description: 'Event successfully created',
    type: EventDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error in request body',
    type: ApiErrorResponseDto,
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
  create(
    @CurrentUser() user: jwtStrategy.AuthenticatedUser,
    @Body() createEventDto: CreateEventDto,
  ): Promise<EventDto> {
    return this.eventsService.create(user.id, createEventDto);
  }

  @Patch(':eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update an existing draft event owned by organizer',
  })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiResponse({
    status: 200,
    description: 'Draft event successfully updated',
    type: EventDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error in request body',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - event not owned by organizer (EVENT_NOT_OWNED_BY_ORGANIZER)',
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
      'Conflict - event is already published and cannot be modified (EVENT_ALREADY_PUBLISHED)',
    type: ApiErrorResponseDto,
  })
  update(
    @CurrentUser() user: jwtStrategy.AuthenticatedUser,
    @Param('eventId') eventId: string,
    @Body() updateEventDto: UpdateEventDto,
  ): Promise<EventDto> {
    return this.eventsService.updateDraft(user.id, eventId, updateEventDto);
  }

  @Post(':eventId/publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Publish a draft event' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiResponse({
    status: 200,
    description: 'Event published successfully',
    type: PublishEventResponseDto,
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - event not owned by organizer (EVENT_NOT_OWNED_BY_ORGANIZER)',
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
      'Conflict - event is already published (EVENT_ALREADY_PUBLISHED)',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 422,
    description:
      'Unprocessable Entity - event validation failed (VALIDATION_ERROR)',
    type: ApiErrorResponseDto,
  })
  publish(
    @CurrentUser() user: jwtStrategy.AuthenticatedUser,
    @Param('eventId') eventId: string,
  ): Promise<PublishEventResponseDto> {
    return this.eventsService.publish(user.id, eventId);
  }

  @Delete(':eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete an event owned by the organizer' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiResponse({
    status: 204,
    description: 'Event successfully deleted',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - event not owned by organizer (EVENT_NOT_OWNED_BY_ORGANIZER)',
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
      'Conflict - event cannot be deleted because it has reservations or tickets (EVENT_CANNOT_BE_DELETED)',
    type: ApiErrorResponseDto,
  })
  delete(
    @CurrentUser() user: jwtStrategy.AuthenticatedUser,
    @Param('eventId') eventId: string,
  ): Promise<void> {
    return this.eventsService.delete(user.id, eventId);
  }

  @Get()
  @ApiOperation({ summary: 'List all published events for public discovery' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of published events',
    type: PaginatedPublicEventsResponseDto,
  })
  findPublicEvents(
    @Query() queryDto: QueryEventsDto,
  ): Promise<PaginatedPublicEventsResponseDto> {
    return this.eventsService.findPublicEvents(queryDto);
  }

  @Get(':eventId')
  @ApiOperation({ summary: 'Get details of a specific published event' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiResponse({
    status: 200,
    description: 'Published event details',
    type: PublicEventDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found or not published (EVENT_NOT_FOUND)',
    type: ApiErrorResponseDto,
  })
  findPublicEventById(
    @Param('eventId') eventId: string,
  ): Promise<PublicEventDto> {
    return this.eventsService.findPublicEventById(eventId);
  }
}
