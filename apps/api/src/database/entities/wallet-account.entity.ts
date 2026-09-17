import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { LedgerTransaction } from './ledger-transaction.entity';

@Entity('wallet_accounts')
@Index(['userId', 'currency'], { unique: true })
export class WalletAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.wallets, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  // Stored in integer minor units (e.g. 1000 = $10.00 USD)
  @Column({ type: 'numeric', precision: 20, scale: 0, default: '0' })
  balanceMinor!: string;

  @Column({ type: 'numeric', precision: 20, scale: 0, default: '0' })
  lockedMinor!: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status!: string;

  @OneToMany(() => LedgerTransaction, (tx) => tx.wallet)
  transactions!: LedgerTransaction[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
