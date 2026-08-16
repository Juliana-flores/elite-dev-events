import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  CustomerTicketDetailDto,
  PaginatedCustomerTicketsResponseDto,
  SharedTicketResponseDto,
} from './dto/ticket-response.dto';
import { Ticket } from './entities/ticket.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    private readonly configService: ConfigService,
  ) {}

  async findCustomerTickets(
    customerId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedCustomerTicketsResponseDto> {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [tickets, totalItems] = await this.ticketRepository.findAndCount({
      where: { customerId },
      relations: { event: true },
      order: { createdAt: 'DESC' },
      skip,
      take: limitNum,
    });

    const totalPages = Math.ceil(totalItems / limitNum) || 1;

    return {
      items: tickets.map((t) => ({
        id: t.id,
        status: t.status,
        event: {
          id: t.event.id,
          title: t.event.title,
          imageUrl: t.event.imageUrl,
          startsAt: t.event.startsAt,
          location: t.event.location,
        },
        createdAt: t.createdAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages,
      },
    };
  }

  async findCustomerTicketById(
    customerId: string,
    ticketId: string,
  ): Promise<CustomerTicketDetailDto> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: { event: true },
    });

    if (!ticket) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'TICKET_NOT_FOUND',
        message: 'Ticket not found',
      });
    }

    if (ticket.customerId !== customerId) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'You are not authorized to view this ticket',
      });
    }

    const appBaseUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const shareUrl = `${appBaseUrl}/tickets/share/${ticket.shareToken}`;

    return {
      id: ticket.id,
      status: ticket.status,
      secureCode: ticket.secureCode,
      shareUrl,
      qrPayload: ticket.secureCode,
      validatedAt: ticket.validatedAt,
      event: {
        id: ticket.event.id,
        title: ticket.event.title,
        imageUrl: ticket.event.imageUrl,
        startsAt: ticket.event.startsAt,
        location: ticket.event.location,
      },
    };
  }

  async findTicketByShareToken(
    shareToken: string,
  ): Promise<SharedTicketResponseDto> {
    const ticket = await this.ticketRepository.findOne({
      where: { shareToken },
      relations: { event: true },
    });

    if (!ticket) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'TICKET_NOT_FOUND',
        message: 'Shared ticket not found',
      });
    }

    return {
      ticket: {
        status: ticket.status,
        qrPayload: ticket.secureCode,
        event: {
          title: ticket.event.title,
          startsAt: ticket.event.startsAt,
          location: ticket.event.location,
          imageUrl: ticket.event.imageUrl,
        },
      },
    };
  }
}
