import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { BetStatus } from '@keno/shared-types';
import { User } from './user.entity';
import { GameRound } from './game-round.entity';

@Entity('bets')
export class Bet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.bets, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Index()
  @Column({ type: 'uuid' })
  roundId!: string;

  @ManyToOne(() => GameRound, (round) => round.bets, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'roundId' })
  round!: GameRound;

  @Column({ type: 'uuid' })
  gameVersionId!: string;

  @Column({ type: 'uuid' })
  paytableVersionId!: string;

  @Column({ type: 'numeric', precision: 20, scale: 0 })
  stakeMinor!: string;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @Column({ type: 'simple-array' })
  selectedNumbers!: number[];

  @Column({ type: 'int' })
  spots!: number;

  @Column({ type: 'int', nullable: true })
  hits?: number;

  @Column({ type: 'simple-array', nullable: true })
  hitNumbers?: number[];

  @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
  multiplier?: number;

  @Column({ type: 'numeric', precision: 20, scale: 0, nullable: true })
  payoutMinor?: string;

  @Column({ type: 'simple-enum', enum: BetStatus, default: BetStatus.PENDING })
  status!: BetStatus;

  @Column({ type: 'varchar', length: 64, unique: true })
  idempotencyKey!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ nullable: true })
  settledAt?: Date;
}
