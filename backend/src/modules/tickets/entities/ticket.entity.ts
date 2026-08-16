import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Event } from '../../events/entities/event.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { User } from '../../users/entities/user.entity';
import { TicketStatus } from '../enums/ticket-status.enum';

@Entity('tickets')
@Index(['reservationId'])
@Index(['eventId'])
@Index(['customerId'])
@Index(['status'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'reservation_id' })
  reservationId!: string;

  @ManyToOne(() => Reservation, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'reservation_id' })
  reservation!: Reservation;

  @Column('uuid', { name: 'event_id' })
  eventId!: string;

  @ManyToOne(() => Event, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'event_id' })
  event!: Event;

  @Column('uuid', { name: 'customer_id' })
  customerId!: string;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'customer_id' })
  customer!: User;

  @Column({ name: 'secure_code', unique: true })
  secureCode!: string;

  @Column({ name: 'share_token', unique: true })
  shareToken!: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    enumName: 'ticket_status',
    default: TicketStatus.VALID,
  })
  status!: TicketStatus;

  @Column({
    type: 'timestamptz',
    name: 'validated_at',
    nullable: true,
  })
  validatedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
