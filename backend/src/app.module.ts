import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { EventsModule } from './modules/events/events.module';
import { GateModule } from './modules/gate/gate.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        type: 'postgres',

        host: configService.getOrThrow<string>('DATABASE_HOST'),
        port: Number(configService.getOrThrow<string>('DATABASE_PORT')),

        username: configService.getOrThrow<string>('DATABASE_USER'),

        password: configService.getOrThrow<string>('DATABASE_PASSWORD'),

        database: configService.getOrThrow<string>('DATABASE_NAME'),

        autoLoadEntities: true,

        synchronize: false,
      }),
    }),
    UsersModule,
    AuthModule,
    CatalogModule,
    EventsModule,
    ReservationsModule,
    PaymentsModule,
    TicketsModule,
    GateModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
