import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PaymentEvidenceSource {
  MACRODROID_SMS = 'MACRODROID_SMS',
  MACRODROID_NOTIFICATION = 'MACRODROID_NOTIFICATION',
  MANUAL_IMPORT = 'MANUAL_IMPORT',
}

export enum PaymentEvidenceStatus {
  UNMATCHED = 'UNMATCHED',
  MATCHED = 'MATCHED',
  PROCESSED = 'PROCESSED',
  IGNORED = 'IGNORED',
}

export enum PaymentProviderName {
  TELEBIRR = 'TELEBIRR',
  MPESA = 'MPESA',
  CBE_BIRR = 'CBE_BIRR',
  CBE_BANK = 'CBE_BANK',
  OTHER_BANK = 'OTHER_BANK',
  UNKNOWN = 'UNKNOWN',
}

@Entity('payment_evidence')
export class PaymentEvidence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'simple-enum',
    enum: PaymentEvidenceSource,
    default: PaymentEvidenceSource.MACRODROID_SMS,
  })
  source!: PaymentEvidenceSource;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceId?: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  senderHeader!: string;

  @Column({ type: 'text' })
  rawText!: string;

  @Column()
  receivedAt!: Date;

  /**
   * SHA-256 hash of normalized notification payload.
   * Ensures identical SMS/notifications sent repeatedly by MacroDroid are never stored twice.
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, unique: true })
  payloadHash!: string;

  @Index()
  @Column({
    type: 'simple-enum',
    enum: PaymentProviderName,
    default: PaymentProviderName.UNKNOWN,
  })
  provider!: PaymentProviderName;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  parsedTransactionRef?: string;

  @Index()
  @Column({ type: 'numeric', precision: 20, scale: 0, nullable: true })
  parsedAmountMinor?: string;

  @Column({ type: 'varchar', length: 10, default: 'ETB' })
  parsedCurrency!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  parsedSenderPhone?: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  parsedSenderName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  parsedSenderAccount?: string;

  @Column({ nullable: true })
  parsedTimestamp?: Date;

  @Index()
  @Column({
    type: 'simple-enum',
    enum: PaymentEvidenceStatus,
    default: PaymentEvidenceStatus.UNMATCHED,
  })
  status!: PaymentEvidenceStatus;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  matchedPaymentRequestId?: string;

  @Column({ type: 'int', nullable: true })
  matchConfidence?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  matchReason?: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
