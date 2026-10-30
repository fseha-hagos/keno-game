import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserStatus, KycStatus, KycTier, UserRole } from '@keno/shared-types';
import { WalletAccount } from './wallet-account.entity';
import { Bet } from './bet.entity';
import { ResponsibleGamblingLimit } from './responsible-gambling-limit.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 30, unique: true, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth?: string;

  @Column({ type: 'simple-enum', enum: UserStatus, default: UserStatus.PENDING_KYC })
  status!: UserStatus;

  @Column({ type: 'simple-enum', enum: KycStatus, default: KycStatus.NOT_STARTED })
  kycStatus!: KycStatus;

  @Column({ type: 'simple-enum', enum: KycTier, default: KycTier.TIER_1 })
  kycTier!: KycTier;

  @Column({ type: 'simple-array', default: UserRole.PLAYER })
  roles!: UserRole[];

  @Column({ nullable: true })
  selfExcludedUntil?: Date;

  @Column({ nullable: true })
  coolingOffUntil?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  currentRefreshTokenHash?: string | null;

  /** Telegram chat_id for admin OTP delivery — set when admin sends /start to the bot */
  @Column({ type: 'varchar', length: 50, nullable: true })
  telegramChatId?: string | null;

  @OneToMany(() => WalletAccount, (wallet) => wallet.user)
  wallets!: WalletAccount[];

  @OneToMany(() => Bet, (bet) => bet.user)
  bets!: Bet[];

  @OneToMany(() => ResponsibleGamblingLimit, (limit) => limit.user)
  limits!: ResponsibleGamblingLimit[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
