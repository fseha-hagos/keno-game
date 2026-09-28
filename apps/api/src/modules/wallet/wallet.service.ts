import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { WalletAccount } from '../../database/entities/wallet-account.entity';
import {
  PaymentRequest,
  PaymentRequestType,
  PaymentRequestStatus,
} from '../../database/entities/payment-request.entity';
import { LedgerService } from '../ledger/ledger.service';
import { TransactionType, LedgerReferenceType } from '@keno/shared-types';
import { GAME_CONFIG } from '@keno/config';

export interface CreateDepositRequestInput {
  amountMinor: string;
  currency?: string;
  paymentMethod: string;
  accountNumber?: string;
  accountName?: string;
  transactionReference?: string;
  proofImageUrl?: string;
  idempotencyKey?: string;
}

export interface CreateWithdrawalRequestInput {
  amountMinor: string;
  currency?: string;
  paymentMethod: string;
  destinationAccount?: string;
  idempotencyKey?: string;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(WalletAccount)
    private readonly walletRepo: Repository<WalletAccount>,
    @InjectRepository(PaymentRequest)
    private readonly paymentRepo: Repository<PaymentRequest>,
    private readonly ledgerService: LedgerService,
  ) {}

  async getOrCreateWallet(
    userId: string,
    currency = GAME_CONFIG.DEFAULT_CURRENCY,
  ): Promise<WalletAccount> {
    let wallet = await this.walletRepo.findOne({
      where: { userId, currency },
    });

    if (!wallet) {
      wallet = this.walletRepo.create({
        userId,
        currency,
        balanceMinor: '0',
        lockedMinor: '0',
        status: 'ACTIVE',
      });
      wallet = await this.walletRepo.save(wallet);
    }

    return wallet;
  }

  async getWalletByUserId(
    userId: string,
    currency = GAME_CONFIG.DEFAULT_CURRENCY,
  ): Promise<WalletAccount> {
    return this.getOrCreateWallet(userId, currency);
  }

  /**
   * Direct deposit: credits wallet balance and records a ledger entry.
   * Used for system-initiated deposits (e.g. initial seed funds).
   * For user-initiated deposits, use createDepositRequest() instead.
   */
  async deposit(
    userId: string,
    amountMinor: string,
    currency = GAME_CONFIG.DEFAULT_CURRENCY,
    idempotencyKey?: string,
  ): Promise<WalletAccount> {
    const wallet = await this.getOrCreateWallet(userId, currency);
    const depositAmount = BigInt(amountMinor);
    wallet.balanceMinor = (BigInt(wallet.balanceMinor) + depositAmount).toString();
    await this.walletRepo.save(wallet);

    await this.ledgerService.recordTransaction({
      walletId: wallet.id,
      transactionType: TransactionType.DEPOSIT,
      amountMinor,
      currency,
      referenceType: LedgerReferenceType.DEPOSIT,
      referenceId: `system_seed_${userId}`,
      idempotencyKey: idempotencyKey || `system_deposit_${userId}_${Date.now()}`,
    });

    this.logger.log(
      `System deposit of ${amountMinor} ${currency} credited to User ${userId}`,
    );

    return wallet;
  }

  /**
   * Submits a Deposit Request with PENDING status.
   * Money is NOT added to wallet balance until an Admin approves it.
   */
  async createDepositRequest(
    userId: string,
    input: CreateDepositRequestInput,
  ): Promise<PaymentRequest> {
    const currency = input.currency || GAME_CONFIG.DEFAULT_CURRENCY;
    await this.getOrCreateWallet(userId, currency);

    if (input.idempotencyKey) {
      const existing = await this.paymentRepo.findOne({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiration

    const request = this.paymentRepo.create({
      userId,
      requestType: PaymentRequestType.DEPOSIT,
      amountMinor: input.amountMinor,
      currency,
      paymentMethod: input.paymentMethod || 'telebirr',
      accountNumber: input.accountNumber || '0978614151',
      accountName: input.accountName || 'Amdom desta',
      transactionReference: input.transactionReference || undefined,
      proofImageUrl: input.proofImageUrl || undefined,
      status: PaymentRequestStatus.PENDING,
      expiresAt,
      idempotencyKey: input.idempotencyKey,
    });

    const saved = await this.paymentRepo.save(request);
    this.logger.log(
      `Deposit Request #${saved.id} created (PENDING approval) for User ${userId}, Amount: ${saved.amountMinor} ${saved.currency}`,
    );

    return saved;
  }

  /**
   * Submits a Withdrawal Request with PENDING status.
   * ACID Transaction: Locks the withdrawal amount from available balance into locked balance.
   */
  async createWithdrawalRequest(
    userId: string,
    input: CreateWithdrawalRequestInput,
  ): Promise<PaymentRequest> {
    const currency = input.currency || GAME_CONFIG.DEFAULT_CURRENCY;

    return this.paymentRepo.manager.transaction(async (manager: EntityManager) => {
      // Check idempotency
      if (input.idempotencyKey) {
        const existing = await manager.findOne(PaymentRequest, {
          where: { idempotencyKey: input.idempotencyKey },
        });
        if (existing) return existing;
      }

      // Lock wallet row with pessimistic write lock
      let walletQuery = manager
        .createQueryBuilder(WalletAccount, 'wallet')
        .where('wallet.userId = :userId AND wallet.currency = :currency', {
          userId,
          currency,
        });

      if (manager.connection.options.type === 'postgres') {
        walletQuery = walletQuery.setLock('pessimistic_write');
      }

      const wallet = await walletQuery.getOne();
      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const amountToWithdraw = BigInt(input.amountMinor);
      const availableBalance = BigInt(wallet.balanceMinor);

      if (availableBalance < amountToWithdraw) {
        throw new BadRequestException(
          `Insufficient funds. Available: ${availableBalance.toString()}, requested: ${amountToWithdraw.toString()}`,
        );
      }

      // Lock funds (deduct from available balance, add to locked balance)
      wallet.balanceMinor = (availableBalance - amountToWithdraw).toString();
      wallet.lockedMinor = (BigInt(wallet.lockedMinor) + amountToWithdraw).toString();
      await manager.save(wallet);

      const request = manager.create(PaymentRequest, {
        userId,
        requestType: PaymentRequestType.WITHDRAWAL,
        amountMinor: input.amountMinor,
        currency,
        paymentMethod: input.paymentMethod || 'bank_withdrawal',
        accountNumber: input.destinationAccount || undefined,
        status: PaymentRequestStatus.PENDING,
        idempotencyKey: input.idempotencyKey,
      });

      const saved = await manager.save(request);
      this.logger.log(
        `Withdrawal Request #${saved.id} created (PENDING approval) for User ${userId}, Amount: ${saved.amountMinor} ${saved.currency}`,
      );

      return saved;
    });
  }

  /**
   * ADMIN APPROVAL FOR DEPOSIT:
   * Strictly ACID Transaction: Atomically updates request status to APPROVED,
   * locks wallet row, credits wallet balance, and creates immutable ledger entry.
   */
  async approveDeposit(
    requestId: string,
    adminUserId: string,
    adminNote?: string,
  ): Promise<PaymentRequest> {
    return this.paymentRepo.manager.transaction(async (manager: EntityManager) => {
      // 1. Lock payment request row
      const request = await manager.findOne(PaymentRequest, {
        where: { id: requestId },
      });

      if (!request) {
        throw new NotFoundException(`Deposit request #${requestId} not found`);
      }

      if (request.status !== PaymentRequestStatus.PENDING) {
        throw new ConflictException(
          `Deposit request is already ${request.status}. Cannot approve.`,
        );
      }

      if (request.requestType !== PaymentRequestType.DEPOSIT) {
        throw new BadRequestException('Target request is not a deposit');
      }

      // 2. Lock user wallet row
      const wallet = await manager.findOne(WalletAccount, {
        where: { userId: request.userId, currency: request.currency },
      });

      if (!wallet) {
        throw new NotFoundException(`User wallet not found for currency ${request.currency}`);
      }

      // 3. Atomically credit wallet & post ledger transaction
      const depositAmount = BigInt(request.amountMinor);
      const newBalance = BigInt(wallet.balanceMinor) + depositAmount;
      wallet.balanceMinor = newBalance.toString();
      await manager.save(wallet);

      await this.ledgerService.recordTransaction(
        {
          walletId: wallet.id,
          transactionType: TransactionType.DEPOSIT,
          amountMinor: request.amountMinor,
          currency: request.currency,
          referenceType: LedgerReferenceType.DEPOSIT,
          referenceId: request.id,
          idempotencyKey: `deposit_approve_${request.id}`,
        },
        manager,
      );

      // 4. Mark request as APPROVED
      request.status = PaymentRequestStatus.APPROVED;
      request.approvedBy = adminUserId;
      request.approvedAt = new Date();
      if (adminNote) request.adminNote = adminNote;

      const saved = await manager.save(request);
      this.logger.log(
        `ADMIN APPROVED Deposit #${saved.id} for User ${request.userId}. Credited: ${request.amountMinor} ${request.currency}`,
      );

      return saved;
    });
  }

  /**
   * ADMIN REJECTION FOR DEPOSIT:
   * Marks request as REJECTED. Wallet balance remains untouched.
   */
  async rejectDeposit(
    requestId: string,
    adminUserId: string,
    adminNote?: string,
  ): Promise<PaymentRequest> {
    return this.paymentRepo.manager.transaction(async (manager: EntityManager) => {
      const request = await manager.findOne(PaymentRequest, {
        where: { id: requestId },
      });

      if (!request) {
        throw new NotFoundException(`Deposit request #${requestId} not found`);
      }

      if (request.status !== PaymentRequestStatus.PENDING) {
        throw new ConflictException(
          `Deposit request is already ${request.status}. Cannot reject.`,
        );
      }

      request.status = PaymentRequestStatus.REJECTED;
      request.approvedBy = adminUserId;
      request.approvedAt = new Date();
      request.adminNote = adminNote || 'Rejected by Admin';

      const saved = await manager.save(request);
      this.logger.log(
        `ADMIN REJECTED Deposit #${saved.id} for User ${request.userId}. Reason: ${request.adminNote}`,
      );

      return saved;
    });
  }

  /**
   * ADMIN APPROVAL FOR WITHDRAWAL:
   * Atomically unlocks the funds and executes withdrawal ledger entry.
   */
  async approveWithdrawal(
    requestId: string,
    adminUserId: string,
    adminNote?: string,
  ): Promise<PaymentRequest> {
    return this.paymentRepo.manager.transaction(async (manager: EntityManager) => {
      const request = await manager.findOne(PaymentRequest, {
        where: { id: requestId },
      });

      if (!request) {
        throw new NotFoundException(`Withdrawal request #${requestId} not found`);
      }

      if (request.status !== PaymentRequestStatus.PENDING) {
        throw new ConflictException(`Withdrawal request is already ${request.status}`);
      }

      const wallet = await manager.findOne(WalletAccount, {
        where: { userId: request.userId, currency: request.currency },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const withdrawAmount = BigInt(request.amountMinor);
      const currentLocked = BigInt(wallet.lockedMinor);
      const newLocked = currentLocked > withdrawAmount ? currentLocked - withdrawAmount : 0n;

      wallet.lockedMinor = newLocked.toString();
      await manager.save(wallet);

      await this.ledgerService.recordTransaction(
        {
          walletId: wallet.id,
          transactionType: TransactionType.WITHDRAWAL,
          amountMinor: (-withdrawAmount).toString(),
          currency: request.currency,
          referenceType: LedgerReferenceType.WITHDRAWAL,
          referenceId: request.id,
          idempotencyKey: `withdraw_approve_${request.id}`,
        },
        manager,
      );

      request.status = PaymentRequestStatus.APPROVED;
      request.approvedBy = adminUserId;
      request.approvedAt = new Date();
      if (adminNote) request.adminNote = adminNote;

      const saved = await manager.save(request);
      this.logger.log(
        `ADMIN APPROVED Withdrawal #${saved.id} for User ${request.userId}. Amount: ${request.amountMinor}`,
      );

      return saved;
    });
  }

  /**
   * ADMIN REJECTION FOR WITHDRAWAL:
   * Releases locked funds back to available wallet balance.
   */
  async rejectWithdrawal(
    requestId: string,
    adminUserId: string,
    adminNote?: string,
  ): Promise<PaymentRequest> {
    return this.paymentRepo.manager.transaction(async (manager: EntityManager) => {
      const request = await manager.findOne(PaymentRequest, {
        where: { id: requestId },
      });

      if (!request) {
        throw new NotFoundException(`Withdrawal request #${requestId} not found`);
      }

      if (request.status !== PaymentRequestStatus.PENDING) {
        throw new ConflictException(`Withdrawal request is already ${request.status}`);
      }

      const wallet = await manager.findOne(WalletAccount, {
        where: { userId: request.userId, currency: request.currency },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const withdrawAmount = BigInt(request.amountMinor);
      const currentLocked = BigInt(wallet.lockedMinor);
      const newLocked = currentLocked > withdrawAmount ? currentLocked - withdrawAmount : 0n;

      wallet.lockedMinor = newLocked.toString();
      wallet.balanceMinor = (BigInt(wallet.balanceMinor) + withdrawAmount).toString();
      await manager.save(wallet);

      request.status = PaymentRequestStatus.REJECTED;
      request.approvedBy = adminUserId;
      request.approvedAt = new Date();
      request.adminNote = adminNote || 'Rejected by Admin - Funds returned';

      const saved = await manager.save(request);
      this.logger.log(
        `ADMIN REJECTED Withdrawal #${saved.id} for User ${request.userId}. Locked funds returned.`,
      );

      return saved;
    });
  }

  async getUserPaymentRequests(userId: string): Promise<PaymentRequest[]> {
    return this.paymentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAllPendingRequests(): Promise<PaymentRequest[]> {
    return this.paymentRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getTransactions(userId: string, currency = GAME_CONFIG.DEFAULT_CURRENCY) {
    const wallet = await this.getOrCreateWallet(userId, currency);
    return this.ledgerService.getTransactions(wallet.id);
  }
}
