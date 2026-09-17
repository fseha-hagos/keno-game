import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { RoundStatus } from '@keno/shared-types';
import { Bet } from './bet.entity';

@Entity('game_rounds')
export class GameRound {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'int', default: 1 })
  roundNumber!: number;

  @Column({ type: 'uuid' })
  gameId!: string;

  @Column({ type: 'uuid' })
  gameVersionId!: string;

  @Index()
  @Column({ type: 'simple-enum', enum: RoundStatus, default: RoundStatus.SCHEDULED })
  status!: RoundStatus;

  @Column()
  scheduledAt!: Date;

  @Column({ nullable: true })
  openedAt?: Date;

  @Column({ nullable: true })
  closedAt?: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  // Exact 20 numbers drawn, immutable after state DRAWN
  @Column({ type: 'simple-array', nullable: true })
  drawResult?: number[];

  // SHA-256 hash of drawResult + seed for provable audit
  @Column({ type: 'varchar', length: 64, nullable: true })
  resultHash?: string;

  @Column({ type: 'numeric', precision: 20, scale: 0, default: '0' })
  totalWageredMinor!: string;

  @Column({ type: 'numeric', precision: 20, scale: 0, default: '0' })
  totalPayoutMinor!: string;

  @OneToMany(() => Bet, (bet) => bet.round)
  bets!: Bet[];

  @CreateDateColumn()
  createdAt!: Date;
}
