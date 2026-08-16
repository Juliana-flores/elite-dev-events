import {
  Check,
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
import { User } from '../../users/entities/user.entity';
import { ReservationStatus } from '../enums/reservation-status.enum';

@Entity('reservations')
@Index(['customerId'])
@Index(['eventId'])
@Index(['status'])
@Check(`"quantity" > 0`)
@Check(`"unit_price" >= 0`)
@Check(`"total_amount" >= 0`)
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'customer_id' })
  customerId!: string;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'customer_id' })
  customer!: User;

  @Column('uuid', { name: 'event_id' })
  eventId!: string;

  @ManyToOne(() => Event, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'event_id' })
  event!: Event;

  @Column('integer')
  quantity!: number;

  @Column('numeric', {
    precision: 10,
    scale: 2,
    name: 'unit_price',
  })
  unitPrice!: string;

  @Column('numeric', {
    precision: 12,
    scale: 2,
    name: 'total_amount',
  })
  totalAmount!: string;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    enumName: 'reservation_status',
    default: ReservationStatus.PENDING_PAYMENT,
  })
  status!: ReservationStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
