import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
  OnModuleInit,
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
import { LedgerTransaction } from '../../database/entities/ledger-transaction.entity';
import {
  PaymentEvidence,
  PaymentEvidenceStatus,
} from '../../database/entities/payment-evidence.entity';
import { TelegramNotificationService } from './telegram-notification.service';
import { TransactionType, LedgerReferenceType } from '@keno/shared-types';
import { GAME_CONFIG } from '@keno/config';
import { AuditService } from '../audit/audit.service';
import { DepositMatchingService } from '../payments/deposit-matching.service';
import { PaymentParserRegistry } from '../payments/parsers/payment-parser.registry';

export interface CreateDepositRequestInput {
  amountMinor: string;
  currency?: string;
  paymentMethod: string;
  accountNumber?: string;
  accountName?: string;
  transactionReference?: string;
  proofImageUrl?: string;
  rawSmsText?: string;
  idempotencyKey?: string;
}

export interface CreateWithdrawalRequestInput {
  amountMinor: string;
  currency?: string;
  paymentMethod: string;
  destinationAccount?: string;
  accountName?: string;
  idempotencyKey?: string;
}

@Injectable()
export class WalletService implements OnModuleInit {
  onModuleInit() {
    setInterval(() => {
      this.expireOverdueRequests().catch((e) =>
        this.logger.warn(`Periodic expireOverdueRequests error: ${e.message}`),
      );
    }, 30_000);
  }
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(WalletAccount)
    private readonly walletRepo: Repository<WalletAccount>,
    @InjectRepository(PaymentRequest)
    private readonly paymentRepo: Repository<PaymentRequest>,
    @InjectRepository(PaymentEvidence)
    private readonly evidenceRepo: Repository<PaymentEvidence>,
    private readonly ledgerService: LedgerService,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => DepositMatchingService))
    private readonly matchingService: DepositMatchingService,
    private readonly parserRegistry: PaymentParserRegistry,
    private readonly telegramNotification: TelegramNotificationService,
  ) {}

  /**
   * Helper to extract clean transaction reference from user input (either direct code or full confirmation SMS)
   */
  extractTransactionReference(rawInput: string): { reference: string; rawSnippet?: string } {
    if (!rawInput) return { reference: '' };
    const trimmed = rawInput.trim();

    // 1. If it's already a short clean alphanumeric token (e.g. DJJ82SWP4M or CI94719082)
    if (/^[A-Za-z0-9_-]{6,30}$/.test(trimmed)) {
      return { reference: trimmed.toUpperCase() };
    }

    // 2. Try parsing via Parser Registry
    try {
      const parsed = this.parserRegistry.parseNotification('', trimmed);
      if (parsed && parsed.transactionReference) {
        return {
          reference: parsed.transactionReference.toUpperCase(),
          rawSnippet: trimmed.length > 50 ? trimmed.substring(0, 300) : undefined,
        };
      }
    } catch {
      // Continue to regex fallback
    }

    // 3. Fallback regexes for various formats (Telebirr, CBE, M-Pesa, receipt URLs)
    const fallbackRegexes = [
      /(?:Your\s+)?(?:transaction\s*(?:number|no|id|code)|txn\s*(?:id|no|code|number)?|trans\s*id|reference|ref|የግብይት\s*ቁጥር)(?:\s+is|\s*[:=-]|\s+)\s*([A-Za-z0-9]{6,25})/i,
      /(?:receipt\/|receipt\?id=)([A-Za-z0-9]{6,25})/i,
      /\b(DK[0-9A-Za-z]{6,16})\b/i,
      /\b(DJ[0-9A-Za-z]{6,16})\b/i,
      /\b(CI[0-9A-Za-z]{6,16})\b/i,
      /\b(DA[0-9A-Za-z]{6,16})\b/i,
      /\b(TB[0-9A-Za-z]{6,16})\b/i,
      /\b(CW[0-9A-Za-z]{6,16})\b/i,
      /\b(NW[0-9A-Za-z]{6,16})\b/i,
      /\b(NL[0-9A-Za-z]{6,16})\b/i,
      /\b(FT[0-9A-Za-z]{6,16})\b/i,
    ];

    for (const reg of fallbackRegexes) {
      const m = trimmed.match(reg);
      if (m && m[1]) {
        return {
          reference: m[1].toUpperCase(),
          rawSnippet: trimmed.length > 50 ? trimmed.substring(0, 300) : undefined,
        };
      }
    }

    // 4. Default fallback: take first word or truncate to 50 chars
    return {
      reference: trimmed.split(/\s+/)[0]?.substring(0, 50).toUpperCase() || trimmed.substring(0, 50),
      rawSnippet: trimmed.length > 50 ? trimmed.substring(0, 300) : undefined,
    };
  }

  async getOrCreateWallet(
    userId: string,
    currency = GAME_CONFIG.DEFAULT_CURRENCY,
  ): Promise<WalletAccount> {
    let wallet = await this.walletRepo.findOne({
      where: { userId, currency },
    });

    if (!wallet) {
      // Check if user has an existing wallet in another currency (e.g. legacy USD wallet)
      const existingWallet = await this.walletRepo.findOne({
        where: { userId },
      });
      const initialBalance = existingWallet ? existingWallet.balanceMinor : '0';
      const initialLocked = existingWallet ? existingWallet.lockedMinor : '0';

      wallet = this.walletRepo.create({
        userId,
        currency,
        balanceMinor: initialBalance,
        lockedMinor: initialLocked,
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

    const { newBalanceMinor } = await this.ledgerService.recordTransaction({
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

    const depositAmountMinor = BigInt(input.amountMinor || '0');
    const minDepositMinor = BigInt(GAME_CONFIG.MIN_DEPOSIT_MINOR || '5000');
    const maxDepositMinor = BigInt(GAME_CONFIG.MAX_DEPOSIT_MINOR || '10000000');

    if (depositAmountMinor < minDepositMinor || depositAmountMinor > maxDepositMinor) {
      const minETB = Number(minDepositMinor) / 100;
      const maxETB = Number(maxDepositMinor) / 100;
      throw new BadRequestException(`Deposit amount must be between ${minETB} ETB and ${maxETB} ETB`);
    }

    if (input.idempotencyKey) {
      const existing = await this.paymentRepo.findOne({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiration

    let initialRef: string | undefined;
    let initialSnippet: string | undefined;
    if (input.transactionReference) {
      const extracted = this.extractTransactionReference(input.transactionReference);
      initialRef = extracted.reference;
      initialSnippet = extracted.rawSnippet;
    }

    const request = this.paymentRepo.create({
      userId,
      requestType: PaymentRequestType.DEPOSIT,
      amountMinor: input.amountMinor,
      currency,
      paymentMethod: input.paymentMethod || 'telebirr',
      accountNumber: input.accountNumber || '0948491265',
      accountName: input.accountName || 'Fseha Hagos',
      transactionReference: initialRef,
      rawSmsText: (input as any).rawSmsText || initialSnippet,
      adminNote: initialSnippet ? `SMS: ${initialSnippet.substring(0, 500)}` : undefined,
      proofImageUrl: input.proofImageUrl || undefined,
      status: PaymentRequestStatus.PENDING,
      expiresAt,
      idempotencyKey: input.idempotencyKey,
    });

    const saved = await this.paymentRepo.save(request);
    this.logger.log(
      `Deposit Request #${saved.id} created (PENDING approval) for User ${userId}, Amount: ${saved.amountMinor} ${saved.currency}`,
    );

    this.telegramNotification
      .notify(saved, 'DEPOSIT_CREATED')
      .catch((e) => this.logger.warn(`Telegram notification error: ${e.message}`));

    // Run matching against existing unmatched evidence
    const matched = await this.matchingService.matchPendingDeposit(saved);
    const depositMinor = matched.amountMinor ? BigInt(matched.amountMinor) : 0n;
    const autoApproveLimit = BigInt(process.env.AUTO_APPROVE_MAX_MINOR || '20000');

    if (
      matched.status === PaymentRequestStatus.PENDING &&
      matched.matchedEvidenceId &&
      (matched.matchConfidence || 0) >= 80 &&
      depositMinor > 0n &&
      depositMinor <= autoApproveLimit
    ) {
      this.logger.log(
        `AUTO-APPROVING Deposit #${matched.id} upon creation (Amount: ${matched.amountMinor} minor <= ${autoApproveLimit}, Confidence: ${matched.matchConfidence}%)`,
      );
      return this.approveDeposit(
        matched.id,
        '00000000-0000-0000-0000-000000000000',
        `Auto-approved: Confirmed via SMS evidence #${matched.matchedEvidenceId} under 200 ETB limit`,
      );
    }

    return matched;
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
      const minWithdrawMinor = BigInt(GAME_CONFIG.MIN_WITHDRAW_MINOR || '10000');
      const maxWithdrawMinor = BigInt(GAME_CONFIG.MAX_WITHDRAW_MINOR || '1000000');

      if (amountToWithdraw < minWithdrawMinor || amountToWithdraw > maxWithdrawMinor) {
        const minETB = Number(minWithdrawMinor) / 100;
        const maxETB = Number(maxWithdrawMinor) / 100;
        throw new BadRequestException(`Withdrawal amount must be between ${minETB} ETB and ${maxETB} ETB`);
      }

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
        accountName: input.accountName || undefined,
        status: PaymentRequestStatus.PENDING,
        idempotencyKey: input.idempotencyKey,
      });

      const saved = await manager.save(request);
      this.logger.log(
        `Withdrawal Request #${saved.id} created (PENDING approval) for User ${userId}, Amount: ${saved.amountMinor} ${saved.currency}`,
      );

      this.telegramNotification
        .notify(saved, 'WITHDRAWAL_CREATED')
        .catch((e) => this.logger.warn(`Telegram notification error: ${e.message}`));

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

      // 3. Atomically credit wallet & post ledger transaction via ledgerService
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

      // 5. Update linked payment evidence if present
      if (request.matchedEvidenceId) {
        await manager.update(
          PaymentEvidence,
          { id: request.matchedEvidenceId },
          {
            status: PaymentEvidenceStatus.PROCESSED,
            matchedPaymentRequestId: request.id,
          },
        );
      }

      const saved = await manager.save(request);
      this.logger.log(
        `ADMIN APPROVED Deposit #${saved.id} for User ${request.userId}. Credited: ${request.amountMinor} ${request.currency}`,
      );

      this.telegramNotification
        .notify(saved, 'REQUEST_APPROVED', { approverId: adminUserId, note: adminNote })
        .catch((e) => this.logger.warn(`Telegram notification error: ${e.message}`));

      // 6. Record immutable audit log
      try {
        await this.auditService.log({
          actorId: adminUserId,
          actorRole: 'SUPER_ADMIN',
          action: 'DEPOSIT_APPROVED',
          entity: 'PaymentRequest',
          entityId: request.id,
          metadata: {
            decision: 'APPROVED',
            amountMinor: request.amountMinor,
            currency: request.currency,
            transactionReference: request.transactionReference,
            paymentMethod: request.paymentMethod,
            matchedEvidenceId: request.matchedEvidenceId,
            customerId: request.userId,
            adminNote: request.adminNote,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (auditErr: any) {
        this.logger.warn(`Failed writing audit log for deposit #${request.id}: ${auditErr.message}`);
      }

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

      // If linked to evidence, unlink evidence so it can be re-evaluated
      if (request.matchedEvidenceId) {
        await manager.update(
          PaymentEvidence,
          { id: request.matchedEvidenceId },
          {
            status: PaymentEvidenceStatus.UNMATCHED,
            matchedPaymentRequestId: undefined,
          },
        );
      }

      const saved = await manager.save(request);
      this.logger.log(
        `ADMIN REJECTED Deposit #${saved.id} for User ${request.userId}. Reason: ${request.adminNote}`,
      );

      this.telegramNotification
        .notify(saved, 'REQUEST_REJECTED', { approverId: adminUserId, note: adminNote })
        .catch((e) => this.logger.warn(`Telegram notification error: ${e.message}`));

      try {
        await this.auditService.log({
          actorId: adminUserId,
          actorRole: 'SUPER_ADMIN',
          action: 'DEPOSIT_REJECTED',
          entity: 'PaymentRequest',
          entityId: request.id,
          metadata: {
            decision: 'REJECTED',
            reason: request.adminNote,
            amountMinor: request.amountMinor,
            currency: request.currency,
            transactionReference: request.transactionReference,
            customerId: request.userId,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (auditErr: any) {
        this.logger.warn(`Failed writing audit log for reject deposit #${request.id}: ${auditErr.message}`);
      }

      return saved;
    });
  }

  /**
   * ADMIN APPROVAL FOR WITHDRAWAL:
   * Atomically releases locked funds and creates an immutable ledger record.
   *
   * IMPORTANT: The funds were already deducted from balanceMinor and moved to
   * lockedMinor during createWithdrawalRequest(). This method only:
   * 1. Releases the lock (removes from lockedMinor)
   * 2. Creates an audit ledger entry (without modifying balanceMinor again)
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

      // Only release the lock — do NOT touch balanceMinor (already deducted at request time)
      wallet.lockedMinor = newLocked.toString();
      await manager.save(wallet);

      // Create an immutable ledger record for audit purposes.
      // We do NOT use ledgerService.recordTransaction() here because that method
      // would deduct from balanceMinor again, causing a double-deduction bug.
      // The balance was already correctly adjusted in createWithdrawalRequest().
      const currentBalance = BigInt(wallet.balanceMinor);
      const ledgerEntry = manager.create(LedgerTransaction, {
        walletId: wallet.id,
        transactionType: TransactionType.WITHDRAWAL,
        amountMinor: (-withdrawAmount).toString(),
        currency: request.currency,
        referenceType: LedgerReferenceType.WITHDRAWAL,
        referenceId: request.id,
        balanceAfterMinor: currentBalance.toString(),
        status: 'COMPLETED',
        idempotencyKey: `withdraw_approve_${request.id}`,
      });
      await manager.save(ledgerEntry);

      request.status = PaymentRequestStatus.APPROVED;
      request.approvedBy = adminUserId;
      request.approvedAt = new Date();
      if (adminNote) request.adminNote = adminNote;

      const saved = await manager.save(request);
      this.logger.log(
        `ADMIN APPROVED Withdrawal #${saved.id} for User ${request.userId}. Amount: ${request.amountMinor}`,
      );

      this.telegramNotification
        .notify(saved, 'REQUEST_APPROVED', { approverId: adminUserId, note: adminNote })
        .catch((e) => this.logger.warn(`Telegram notification error: ${e.message}`));

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

      this.telegramNotification
        .notify(saved, 'REQUEST_REJECTED', { approverId: adminUserId, note: adminNote })
        .catch((e) => this.logger.warn(`Telegram notification error: ${e.message}`));

      return saved;
    });
  }

  async getUserPaymentRequests(userId: string): Promise<PaymentRequest[]> {
    await this.expireOverdueRequests();
    return this.paymentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Player submits proof/transaction reference for their own pending deposit request.
   */
  async submitDepositProof(
    userId: string,
    requestId: string,
    proof: { transactionReference?: string; proofImageUrl?: string; rawSmsText?: string },
  ): Promise<PaymentRequest> {
    const request = await this.paymentRepo.findOne({
      where: { id: requestId, userId },
    });

    if (!request) {
      throw new NotFoundException(`Deposit request #${requestId} not found`);
    }

    if (request.status !== PaymentRequestStatus.PENDING) {
      throw new ConflictException(
        `Deposit request is already ${request.status}. Cannot update proof.`,
      );
    }

    if (request.requestType !== PaymentRequestType.DEPOSIT) {
      throw new BadRequestException('Target request is not a deposit');
    }

    if (proof.transactionReference || proof.rawSmsText) {
      const inputRef = (proof.transactionReference || proof.rawSmsText || '').trim();
      const extracted = this.extractTransactionReference(inputRef);
      request.transactionReference = (extracted.reference || inputRef).substring(0, 100);
      const snippet = proof.rawSmsText || extracted.rawSnippet;
      if (snippet) {
        request.rawSmsText = snippet;
        if (!request.adminNote) {
          request.adminNote = `SMS: ${snippet.substring(0, 500)}`;
        }
      }
    }
    if (proof.proofImageUrl) {
      request.proofImageUrl = proof.proofImageUrl;
    }

    const saved = await this.paymentRepo.save(request);
    this.logger.log(
      `Deposit #${saved.id} proof updated by User ${userId}. Ref: ${saved.transactionReference}`,
    );

    this.telegramNotification
      .notify(saved, 'DEPOSIT_PROOF_SUBMITTED')
      .catch((e) => this.logger.warn(`Telegram notification error: ${e.message}`));

    // Auto-match after user provides or updates reference code
    const matched = await this.matchingService.matchPendingDeposit(saved);
    const depositMinor = matched.amountMinor ? BigInt(matched.amountMinor) : 0n;
    const autoApproveLimit = BigInt(process.env.AUTO_APPROVE_MAX_MINOR || '20000');

    if (
      matched.status === PaymentRequestStatus.PENDING &&
      matched.matchedEvidenceId &&
      (matched.matchConfidence || 0) >= 80 &&
      depositMinor > 0n &&
      depositMinor <= autoApproveLimit
    ) {
      this.logger.log(
        `AUTO-APPROVING Deposit #${matched.id} upon proof submission (Amount: ${matched.amountMinor} minor <= ${autoApproveLimit}, Confidence: ${matched.matchConfidence}%)`,
      );
      return this.approveDeposit(
        matched.id,
        '00000000-0000-0000-0000-000000000000',
        `Auto-approved: Confirmed via SMS evidence #${matched.matchedEvidenceId} under 200 ETB limit`,
      );
    }

    return matched;
  }

  async getAllPendingRequests(): Promise<any[]> {
    await this.expireOverdueRequests();
    const requests = await this.paymentRepo.find({
      order: { createdAt: 'DESC' },
    });

    // Enrich requests with user details & approver details
    const userIds = requests.map((r) => r.userId).filter(Boolean);
    const approverIds = requests
      .map((r) => r.approvedBy)
      .filter((id): id is string => Boolean(id) && id !== '00000000-0000-0000-0000-000000000000');
    const allUserIds = [...new Set([...userIds, ...approverIds])];

    let userMap = new Map<string, any>();
    if (allUserIds.length > 0) {
      try {
        const users = await this.paymentRepo.manager.query(
          `SELECT "id"::text as id, "username", "phone", "email", "roles" FROM "users" WHERE "id"::text = ANY($1)`,
          [allUserIds],
        );
        userMap = new Map(users.map((u: any) => [u.id, u]));
      } catch (err: any) {
        this.logger.warn(`Could not enrich users: ${err.message}`);
      }
    }

    const approverMap = new Map<string, any>();
    approverMap.set('00000000-0000-0000-0000-000000000000', {
      id: '00000000-0000-0000-0000-000000000000',
      username: 'SYSTEM',
      phone: 'AUTOMATION',
      role: 'MACRODROID_SMS',
      label: 'MacroDroid Auto-Approval Engine',
    });

    for (const [id, u] of userMap.entries()) {
      const roleStr = Array.isArray(u.roles) ? u.roles.join(', ') : (u.roles || 'OPERATOR');
      approverMap.set(id, {
        id: u.id,
        username: u.username,
        phone: u.phone,
        email: u.email,
        roles: u.roles,
        role: roleStr,
        label: u.phone ? `${u.username || 'Staff'} (${u.phone})` : u.username || 'Staff',
      });
    }

    // Enrich requests with matched evidence if present
    const evidenceIds = requests
      .map((r) => r.matchedEvidenceId)
      .filter((id): id is string => Boolean(id));

    let evidenceMap = new Map<string, any>();
    if (evidenceIds.length > 0) {
      const evidences = await this.evidenceRepo.find({
        where: evidenceIds.map((id) => ({ id })),
      });
      evidenceMap = new Map(evidences.map((e) => [e.id, e]));
    }

    return requests.map((req) => ({
      ...req,
      user: userMap.get(req.userId) || null,
      approver: req.approvedBy ? approverMap.get(req.approvedBy) || null : null,
      matchedEvidence: req.matchedEvidenceId ? evidenceMap.get(req.matchedEvidenceId) || null : null,
    }));
  }

  async getTransactions(userId: string, currency = GAME_CONFIG.DEFAULT_CURRENCY) {
    const wallet = await this.getOrCreateWallet(userId, currency);
    return this.ledgerService.getTransactions(wallet.id);
  }

  /**
   * Allows player to cancel their own pending deposit or withdrawal request before it expires.
   * If cancelling a withdrawal, locked funds are immediately unlocked and refunded to available balance.
   */
  async cancelPaymentRequest(userId: string, requestId: string): Promise<PaymentRequest> {
    return this.paymentRepo.manager.transaction(async (manager: EntityManager) => {
      const request = await manager.findOne(PaymentRequest, {
        where: { id: requestId },
      });

      if (!request) {
        throw new NotFoundException(`Payment request #${requestId} not found`);
      }

      if (request.userId !== userId) {
        throw new ForbiddenException('You are not authorized to cancel this payment request');
      }

      if (request.status !== PaymentRequestStatus.PENDING) {
        throw new BadRequestException(`Cannot cancel a payment request that is already ${request.status}`);
      }

      if (request.requestType === PaymentRequestType.WITHDRAWAL) {
        const wallet = await manager.findOne(WalletAccount, {
          where: { userId: request.userId, currency: request.currency },
        });

        if (wallet) {
          const withdrawAmount = BigInt(request.amountMinor);
          const currentLocked = BigInt(wallet.lockedMinor);
          wallet.lockedMinor = (currentLocked > withdrawAmount ? currentLocked - withdrawAmount : 0n).toString();
          wallet.balanceMinor = (BigInt(wallet.balanceMinor) + withdrawAmount).toString();
          await manager.save(wallet);
        }

        request.status = PaymentRequestStatus.CANCELLED;
        request.adminNote = 'Cancelled by user - Locked funds refunded to balance';
      } else {
        request.status = PaymentRequestStatus.CANCELLED;
        request.adminNote = 'Cancelled by user';
      }

      const saved = await manager.save(request);
      this.logger.log(`Payment Request #${saved.id} (${saved.requestType}) CANCELLED by user ${userId}`);

      this.telegramNotification
        .notify(saved, 'REQUEST_CANCELLED', { approverId: userId, note: request.adminNote })
        .catch((e) => this.logger.warn(`Telegram notification error: ${e.message}`));

      return saved;
    });
  }

  /**
   * Automatically expires overdue pending requests where expiresAt <= NOW().
   * For expired withdrawals, locked funds are safely refunded back to player balance.
   */
  async expireOverdueRequests(): Promise<number> {
    const now = new Date();
    const overdue = await this.paymentRepo
      .createQueryBuilder('pr')
      .where('pr.status = :status', { status: PaymentRequestStatus.PENDING })
      .andWhere('pr.expiresAt IS NOT NULL')
      .andWhere('pr.expiresAt <= :now', { now })
      .getMany();

    if (overdue.length === 0) return 0;

    let expiredCount = 0;
    for (const req of overdue) {
      try {
        await this.paymentRepo.manager.transaction(async (manager: EntityManager) => {
          const current = await manager.findOne(PaymentRequest, { where: { id: req.id } });
          if (!current || current.status !== PaymentRequestStatus.PENDING) return;

          if (current.requestType === PaymentRequestType.WITHDRAWAL) {
            const wallet = await manager.findOne(WalletAccount, {
              where: { userId: current.userId, currency: current.currency },
            });
            if (wallet) {
              const withdrawAmount = BigInt(current.amountMinor);
              const currentLocked = BigInt(wallet.lockedMinor);
              wallet.lockedMinor = (currentLocked > withdrawAmount ? currentLocked - withdrawAmount : 0n).toString();
              wallet.balanceMinor = (BigInt(wallet.balanceMinor) + withdrawAmount).toString();
              await manager.save(wallet);
            }
            current.status = PaymentRequestStatus.EXPIRED;
            current.adminNote = 'Auto-expired: Processing time limit exceeded. Locked funds refunded.';
          } else {
            current.status = PaymentRequestStatus.EXPIRED;
            current.adminNote = 'Auto-expired: Payment proof not submitted/verified within expiration window.';
          }

          const saved = await manager.save(current);
          expiredCount++;
          this.logger.log(`Payment Request #${saved.id} (${saved.requestType}) AUTO-EXPIRED`);

          this.telegramNotification
            .notify(saved, 'REQUEST_EXPIRED', { note: current.adminNote })
            .catch((e) => this.logger.warn(`Telegram notification error: ${e.message}`));
        });
      } catch (err: any) {
        this.logger.error(`Error auto-expiring payment request #${req.id}: ${err.message}`);
      }
    }

    return expiredCount;
  }

}
