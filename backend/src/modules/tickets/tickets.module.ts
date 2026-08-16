import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { Ticket } from './entities/ticket.entity';
import { PublicTicketsController } from './public-tickets.controller';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket]), AuthModule],
  controllers: [TicketsController, PublicTicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
