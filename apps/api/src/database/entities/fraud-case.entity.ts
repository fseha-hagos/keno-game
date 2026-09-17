import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('fraud_cases')
export class FraudCase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 100 })
  reason!: string;

  @Column({ type: 'varchar', length: 20, default: 'OPEN' })
  status!: string; // OPEN, INVESTIGATING, RESOLVED, BANNED

  @Column({ type: 'simple-json', nullable: true })
  evidence?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;
}
