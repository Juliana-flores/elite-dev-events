import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Event } from './entities/event.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { OrganizerEventsController } from './organizer-events.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Ticket, Reservation]), AuthModule],
  controllers: [EventsController, OrganizerEventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
