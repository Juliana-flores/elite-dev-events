import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../tickets/enums/ticket-status.enum';
import { GateValidationResponseDto } from './dto/gate-validation-response.dto';
import { ValidateTicketDto } from './dto/validate-ticket.dto';
import { GateValidationResult } from './enums/gate-validation-result.enum';

@Injectable()
export class GateService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    private readonly dataSource: DataSource,
  ) {}

  async validateTicket(
    _gateUserId: string,
    validateDto: ValidateTicketDto,
  ): Promise<GateValidationResponseDto> {
    const code = validateDto.code.trim();

    return this.dataSource.transaction(async (manager) => {
      const ticket = await manager
        .getRepository(Ticket)
        .createQueryBuilder('ticket')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('ticket.event', 'event')
        .where('ticket.secureCode = :code', { code })
        .getOne();

      if (!ticket) {
        return {
          result: GateValidationResult.INVALID,
        };
      }

      if (ticket.eventId !== validateDto.eventId) {
        return {
          result: GateValidationResult.WRONG_EVENT,
          ticket: {
            id: ticket.id,
          },
        };
      }

      if (ticket.status === TicketStatus.USED) {
        return {
          result: GateValidationResult.ALREADY_USED,
          ticket: {
            id: ticket.id,
            status: TicketStatus.USED,
            validatedAt: ticket.validatedAt,
          },
        };
      }

      if (ticket.status === TicketStatus.VALID) {
        ticket.status = TicketStatus.USED;
        ticket.validatedAt = new Date();
        const savedTicket = await manager.save(Ticket, ticket);

        return {
          result: GateValidationResult.VALID,
          ticket: {
            id: savedTicket.id,
            status: TicketStatus.USED,
            validatedAt: savedTicket.validatedAt,
          },
          event: {
            id: ticket.event.id,
            title: ticket.event.title,
          },
        };
      }

      return {
        result: GateValidationResult.INVALID,
      };
    });
  }
}
