import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Event } from '../events/entities/event.entity';
import { EventStatus } from '../events/enums/event-status.enum';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';
import { Reservation } from './entities/reservation.entity';
import { ReservationStatus } from './enums/reservation-status.enum';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async create(
    customerId: string,
    createDto: CreateReservationDto,
  ): Promise<ReservationResponseDto> {
    const event = await this.eventRepository.findOne({
      where: { id: createDto.eventId },
    });

    if (!event) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found',
      });
    }

    if (event.status !== EventStatus.PUBLISHED) {
      throw new ConflictException({
        statusCode: 409,
        code: 'EVENT_NOT_PUBLISHED',
        message: 'Reservations can only be made for published events',
      });
    }

    const now = new Date();
    if (new Date(event.startsAt) <= now) {
      throw new ConflictException({
        statusCode: 409,
        code: 'EVENT_ALREADY_STARTED',
        message: 'Event has already started or ended',
      });
    }

    // Preliminary availability check: if requested quantity exceeds total event capacity
    if (createDto.quantity > event.capacity) {
      throw new ConflictException({
        statusCode: 409,
        code: 'EVENT_SOLD_OUT',
        message: 'Requested quantity exceeds available event capacity',
      });
    }

    const unitPriceNumber = parseFloat(event.price);
    const totalAmountNumber = unitPriceNumber * createDto.quantity;
    const totalAmount = totalAmountNumber.toFixed(2);
    const unitPrice = unitPriceNumber.toFixed(2);

    const reservation = this.reservationRepository.create({
      customerId,
      eventId: event.id,
      quantity: createDto.quantity,
      unitPrice,
      totalAmount,
      status: ReservationStatus.PENDING_PAYMENT,
    });

    const saved = await this.reservationRepository.save(reservation);

    return this.toResponseDto(saved);
  }

  async findById(
    customerId: string,
    reservationId: string,
  ): Promise<ReservationResponseDto> {
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
        message: 'You are not authorized to view this reservation',
      });
    }

    return this.toResponseDto(reservation);
  }

  private toResponseDto(reservation: Reservation): ReservationResponseDto {
    return {
      id: reservation.id,
      eventId: reservation.eventId,
      customerId: reservation.customerId,
      quantity: reservation.quantity,
      unitPrice: reservation.unitPrice,
      totalAmount: reservation.totalAmount,
      status: reservation.status,
      createdAt: reservation.createdAt,
    };
  }
}
