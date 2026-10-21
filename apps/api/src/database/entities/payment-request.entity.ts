import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PaymentRequestType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
}

export enum PaymentRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('payment_requests')
export class PaymentRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'simple-enum', enum: PaymentRequestType })
  requestType!: PaymentRequestType;

  @Column({ type: 'numeric', precision: 20, scale: 0 })
  amountMinor!: string;

  @Column({ type: 'varchar', length: 10, default: 'ETB' })
  currency!: string;

  @Column({ type: 'varchar', length: 50 })
  paymentMethod!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  accountNumber?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  accountName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transactionReference?: string;

  @Column({ type: 'text', nullable: true })
  proofImageUrl?: string;

  @Index()
  @Column({ type: 'simple-enum', enum: PaymentRequestStatus, default: PaymentRequestStatus.PENDING })
  status!: PaymentRequestStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  adminNote?: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  matchedEvidenceId?: string;

  @Column({ type: 'int', nullable: true })
  matchConfidence?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  matchReason?: string;

  @Column({ type: 'uuid', nullable: true })
  approvedBy?: string;

  @Column({ nullable: true })
  approvedAt?: Date;

  @Column({ nullable: true })
  expiresAt?: Date;

  @Index({ unique: true, sparse: true })
  @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
  idempotencyKey?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
