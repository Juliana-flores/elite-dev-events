import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { Event } from './entities/event.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { OrganizerEventsController } from './organizer-events.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Event]), AuthModule],
  controllers: [EventsController, OrganizerEventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
