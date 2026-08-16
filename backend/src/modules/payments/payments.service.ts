import * as crypto from 'crypto';

import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { Event } from '../events/entities/event.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { ReservationStatus } from '../reservations/enums/reservation-status.enum';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../tickets/enums/ticket-status.enum';
import { ProcessPaymentResponseDto } from './dto/payment-response.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { Payment } from './entities/payment.entity';
import { PaymentSimulation } from './enums/payment-simulation.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from './providers/payment-provider.interface';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: PaymentProvider,
    private readonly dataSource: DataSource,
  ) {}

  async processPayment(
    customerId: string,
    reservationId: string,
    processDto: ProcessPaymentDto,
  ): Promise<ProcessPaymentResponseDto> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'RESERVATION_NOT_FOUND',
        message: 'Reservation not found',
      });
    }

    if (reservation.customerId !== customerId) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'RESERVATION_NOT_OWNED_BY_CUSTOMER',
        message: 'You are not authorized to pay for this reservation',
      });
    }

    if (reservation.status === ReservationStatus.PAID) {
      throw new ConflictException({
        statusCode: 409,
        code: 'RESERVATION_ALREADY_PAID',
        message: 'This reservation has already been paid',
      });
    }

    if (reservation.status !== ReservationStatus.PENDING_PAYMENT) {
      throw new ConflictException({
        statusCode: 409,
        code: 'RESERVATION_NOT_PAYABLE',
        message: 'Reservation is not in payable state',
      });
    }

    const providerResult = await this.paymentProvider.processPayment(
      reservation.totalAmount,
      processDto.simulation,
    );

    if (
      !providerResult.success ||
      processDto.simulation === PaymentSimulation.DECLINE
    ) {
      const payment = this.paymentRepository.create({
        reservationId: reservation.id,
        amount: reservation.totalAmount,
        status: PaymentStatus.DECLINED,
        provider: providerResult.provider || 'FAKE',
      });
      const savedPayment = await this.paymentRepository.save(payment);

      reservation.status = ReservationStatus.PAYMENT_FAILED;
      await this.reservationRepository.save(reservation);

      return {
        reservation: {
          id: reservation.id,
          status: reservation.status,
          quantity: reservation.quantity,
          totalAmount: reservation.totalAmount,
        },
        payment: {
          id: savedPayment.id,
          status: savedPayment.status,
          provider: savedPayment.provider,
          amount: savedPayment.amount,
        },
        tickets: [],
      };
    }

    // Execute atomic transaction with pessimistic locking
    return this.dataSource.transaction(async (manager) => {
      const event = await manager
        .getRepository(Event)
        .createQueryBuilder('event')
        .setLock('pessimistic_write')
        .where('event.id = :eventId', { eventId: reservation.eventId })
        .getOne();

      if (!event) {
        throw new NotFoundException({
          statusCode: 404,
          code: 'EVENT_NOT_FOUND',
          message: 'Event not found',
        });
      }

      // Recalculate confirmed tickets within the locked transaction
      const confirmedCount = await manager.getRepository(Ticket).count({
        where: {
          eventId: event.id,
          status: In([TicketStatus.VALID, TicketStatus.USED]),
        },
      });

      if (confirmedCount + reservation.quantity > event.capacity) {
        throw new ConflictException({
          statusCode: 409,
          code: 'EVENT_SOLD_OUT',
          message: 'There are not enough tickets available for this event',
        });
      }

      const payment = manager.getRepository(Payment).create({
        reservationId: reservation.id,
        amount: reservation.totalAmount,
        status: PaymentStatus.APPROVED,
        provider: providerResult.provider || 'FAKE',
      });
      const savedPayment = await manager.getRepository(Payment).save(payment);

      reservation.status = ReservationStatus.PAID;
      await manager.getRepository(Reservation).save(reservation);

      const tickets: Ticket[] = [];
      for (let i = 0; i < reservation.quantity; i++) {
        const secureCode = crypto.randomBytes(16).toString('hex');
        const shareToken = crypto.randomBytes(16).toString('hex');

        const ticket = manager.getRepository(Ticket).create({
          reservationId: reservation.id,
          eventId: event.id,
          customerId: reservation.customerId,
          secureCode,
          shareToken,
          status: TicketStatus.VALID,
          validatedAt: null,
        });
        tickets.push(ticket);
      }

      const savedTickets = await manager.getRepository(Ticket).save(tickets);

      return {
        reservation: {
          id: reservation.id,
          status: reservation.status,
          quantity: reservation.quantity,
          totalAmount: reservation.totalAmount,
        },
        payment: {
          id: savedPayment.id,
          status: savedPayment.status,
          provider: savedPayment.provider,
          amount: savedPayment.amount,
        },
        tickets: savedTickets.map((t) => ({
          id: t.id,
          status: t.status,
        })),
      };
    });
  }
}
