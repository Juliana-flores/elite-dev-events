import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';

import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../tickets/enums/ticket-status.enum';
import { CreateEventDto } from './dto/create-event.dto';
import {
  EventDto,
  PaginatedOrganizerEventsResponseDto,
  PaginatedPublicEventsResponseDto,
  PublicEventDto,
  PublishEventResponseDto,
} from './dto/event-response.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { QueryOrganizerEventsDto } from './dto/query-organizer-events.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entities/event.entity';
import { EventStatus } from './enums/event-status.enum';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  async create(organizerId: string, createDto: CreateEventDto): Promise<Event> {
    const formattedPrice = Number(createDto.price).toFixed(2);

    const event = this.eventsRepository.create({
      organizerId,
      externalCatalogId: createDto.externalCatalogId,
      title: createDto.title.trim(),
      description: createDto.description?.trim() || null,
      imageUrl: createDto.imageUrl?.trim() || null,
      startsAt: new Date(createDto.startsAt),
      location: createDto.location.trim(),
      capacity: createDto.capacity,
      price: formattedPrice,
      status: EventStatus.DRAFT,
    });

    return this.eventsRepository.save(event);
  }

  async updateDraft(
    organizerId: string,
    eventId: string,
    updateDto: UpdateEventDto,
  ): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found',
      });
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'EVENT_NOT_OWNED_BY_ORGANIZER',
        message: 'You can only update your own events',
      });
    }

    if (event.status !== EventStatus.DRAFT) {
      throw new ConflictException({
        statusCode: 409,
        code: 'EVENT_ALREADY_PUBLISHED',
        message: 'Only draft events can be modified',
      });
    }

    if (updateDto.startsAt !== undefined) {
      event.startsAt = new Date(updateDto.startsAt);
    }
    if (updateDto.location !== undefined) {
      event.location = updateDto.location.trim();
    }
    if (updateDto.capacity !== undefined) {
      event.capacity = updateDto.capacity;
    }
    if (updateDto.price !== undefined) {
      event.price = Number(updateDto.price).toFixed(2);
    }

    return this.eventsRepository.save(event);
  }

  async publish(
    organizerId: string,
    eventId: string,
  ): Promise<PublishEventResponseDto> {
    const event = await this.eventsRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found',
      });
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'EVENT_NOT_OWNED_BY_ORGANIZER',
        message: 'You can only publish your own events',
      });
    }

    if (event.status === EventStatus.PUBLISHED) {
      throw new ConflictException({
        statusCode: 409,
        code: 'EVENT_ALREADY_PUBLISHED',
        message: 'Event is already published',
      });
    }

    if (new Date(event.startsAt).getTime() <= Date.now()) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'VALIDATION_ERROR',
        message: 'Event date must be in the future to be published',
      });
    }

    if (event.capacity <= 0) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'VALIDATION_ERROR',
        message: 'Event capacity must be greater than 0',
      });
    }

    if (Number(event.price) < 0) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'VALIDATION_ERROR',
        message: 'Event price must be greater than or equal to 0',
      });
    }

    event.status = EventStatus.PUBLISHED;
    const saved = await this.eventsRepository.save(event);

    return {
      id: saved.id,
      status: EventStatus.PUBLISHED,
      published: true,
    };
  }

  async findOrganizerEvents(
    organizerId: string,
    query: QueryOrganizerEventsDto,
  ): Promise<PaginatedOrganizerEventsResponseDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizerId };
    if (query.status) {
      where.status = query.status;
    }

    const [events, totalItems] = await this.eventsRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const items: EventDto[] = events.map((e) => this.mapToEventDto(e));
    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  async findPublicEvents(
    query: QueryEventsDto,
  ): Promise<PaginatedPublicEventsResponseDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      status: EventStatus.PUBLISHED,
    };

    if (query.search && query.search.trim()) {
      where.title = ILike(`%${query.search.trim()}%`);
    }

    const [events, totalItems] = await this.eventsRepository.findAndCount({
      where,
      order: { startsAt: 'ASC' },
      skip,
      take: limit,
    });

    const eventIds = events.map((e) => e.id);
    let confirmedMap = new Map<string, number>();

    if (eventIds.length > 0) {
      const counts = await this.ticketRepository
        .createQueryBuilder('ticket')
        .select('ticket.eventId', 'eventId')
        .addSelect('COUNT(ticket.id)', 'count')
        .where('ticket.eventId IN (:...eventIds)', { eventIds })
        .andWhere('ticket.status IN (:...statuses)', {
          statuses: [TicketStatus.VALID, TicketStatus.USED],
        })
        .groupBy('ticket.eventId')
        .getRawMany<{ eventId: string; count: string }>();

      confirmedMap = new Map(
        counts.map((c) => [c.eventId, Number(c.count) || 0]),
      );
    }

    const items: PublicEventDto[] = events.map((e) =>
      this.mapToPublicEventDto(e, confirmedMap.get(e.id) || 0),
    );
    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  async findPublicEventById(eventId: string): Promise<PublicEventDto> {
    const event = await this.eventsRepository.findOne({
      where: {
        id: eventId,
        status: EventStatus.PUBLISHED,
      },
    });

    if (!event) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found or not published',
      });
    }

    const confirmedCount = await this.ticketRepository.count({
      where: {
        eventId,
        status: In([TicketStatus.VALID, TicketStatus.USED]),
      },
    });

    return this.mapToPublicEventDto(event, confirmedCount);
  }

  private mapToEventDto(event: Event): EventDto {
    return {
      id: event.id,
      organizerId: event.organizerId,
      externalCatalogId: event.externalCatalogId,
      title: event.title,
      description: event.description,
      imageUrl: event.imageUrl,
      startsAt: event.startsAt,
      location: event.location,
      capacity: event.capacity,
      price: event.price,
      status: event.status,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }

  private mapToPublicEventDto(
    event: Event,
    confirmedTickets = 0,
  ): PublicEventDto {
    const availableTickets = Math.max(0, event.capacity - confirmedTickets);

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      imageUrl: event.imageUrl,
      startsAt: event.startsAt,
      location: event.location,
      capacity: event.capacity,
      availableTickets,
      price: event.price,
      status: event.status,
    };
  }
}
