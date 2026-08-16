import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Reservation } from '../../reservations/entities/reservation.entity';
import { PaymentStatus } from '../enums/payment-status.enum';

@Entity('payments')
@Index(['status'])
@Check(`"amount" >= 0`)
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'reservation_id', unique: true })
  reservationId!: string;

  @OneToOne(() => Reservation, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'reservation_id' })
  reservation!: Reservation;

  @Column('numeric', {
    precision: 12,
    scale: 2,
  })
  amount!: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status',
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @Column({
    default: 'FAKE',
  })
  provider!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
