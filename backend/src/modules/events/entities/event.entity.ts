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

import { User } from '../../users/entities/user.entity';
import { EventStatus } from '../enums/event-status.enum';

@Entity('events')
@Index(['status', 'startsAt'])
@Index(['organizerId'])
@Check(`"capacity" > 0`)
@Check(`"price" >= 0`)
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'organizer_id' })
  organizerId!: string;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'organizer_id' })
  organizer!: User;

  @Column({ name: 'external_catalog_id' })
  externalCatalogId!: string;

  @Column()
  title!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('text', { name: 'image_url', nullable: true })
  imageUrl!: string | null;

  @Column({ type: 'timestamptz', name: 'starts_at' })
  startsAt!: Date;

  @Column()
  location!: string;

  @Column('integer')
  capacity!: number;

  @Column('numeric', {
    precision: 10,
    scale: 2,
  })
  price!: string;

  @Column({
    type: 'enum',
    enum: EventStatus,
    enumName: 'event_status',
    default: EventStatus.DRAFT,
  })
  status!: EventStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
