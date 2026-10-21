import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { TransactionType, LedgerReferenceType } from '@keno/shared-types';
import { WalletAccount } from './wallet-account.entity';

@Entity('ledger_transactions')
export class LedgerTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  walletId!: string;

  @ManyToOne(() => WalletAccount, (wallet) => wallet.transactions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'walletId' })
  wallet!: WalletAccount;

  @Column({ type: 'simple-enum', enum: TransactionType })
  transactionType!: TransactionType;

  // Signed integer minor units: negative = debit, positive = credit
  @Column({ type: 'numeric', precision: 20, scale: 0 })
  amountMinor!: string;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @Column({ type: 'simple-enum', enum: LedgerReferenceType, nullable: true })
  referenceType?: LedgerReferenceType;

  @Column({ type: 'varchar', length: 128, nullable: true })
  referenceId?: string;

  @Column({ type: 'numeric', precision: 20, scale: 0 })
  balanceAfterMinor!: string;

  @Column({ type: 'varchar', length: 20, default: 'COMPLETED' })
  status!: string;

  @Index({ unique: true, sparse: true })
  @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
  idempotencyKey?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
