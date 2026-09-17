import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { LimitType, LimitDuration } from '@keno/shared-types';
import { User } from './user.entity';

@Entity('responsible_gambling_limits')
@Index(['userId', 'limitType', 'duration'], { unique: true })
export class ResponsibleGamblingLimit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.limits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'simple-enum', enum: LimitType })
  limitType!: LimitType;

  @Column({ type: 'simple-enum', enum: LimitDuration })
  duration!: LimitDuration;

  // Stored in minor units (e.g. "5000" for $50.00)
  @Column({ type: 'numeric', precision: 20, scale: 0, nullable: true })
  amountMinor?: string;

  @Column({ type: 'int', nullable: true })
  durationMinutes?: number;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  activeFrom!: Date;

  // Cool-off period for limit relaxation / removal (e.g. 24h wait)
  @Column({ nullable: true })
  pendingChangeAt?: Date;

  @Column({ type: 'numeric', precision: 20, scale: 0, nullable: true })
  pendingAmountMinor?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
