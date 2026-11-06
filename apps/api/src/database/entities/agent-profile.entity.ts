import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('agent_profiles')
export class AgentProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telebirrNumber?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  telebirrName?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cbeNumber?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cbeName?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // Total float credited into this agent's float wallet by Admin (minor units / cents)
  @Column({ type: 'numeric', precision: 20, scale: 0, default: '0' })
  totalFloatCreditedMinor!: string;

  // Total deposit volume approved by this agent (minor units / cents)
  @Column({ type: 'numeric', precision: 20, scale: 0, default: '0' })
  totalDepositsApprovedMinor!: string;

  // Total withdrawal volume approved by this agent (minor units / cents)
  @Column({ type: 'numeric', precision: 20, scale: 0, default: '0' })
  totalWithdrawalsApprovedMinor!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

