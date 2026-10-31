import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaymentEvidence,
  PaymentEvidenceStatus,
} from '../../database/entities/payment-evidence.entity';
import {
  PaymentRequest,
  PaymentRequestStatus,
  PaymentRequestType,
} from '../../database/entities/payment-request.entity';
import { User } from '../../database/entities/user.entity';
import { mapMethodToProviderName } from './providers/payment-providers.config';
import { WalletService } from '../wallet/wallet.service';

export interface MatchCandidate {
  deposit: PaymentRequest;
  confidence: number;
  reason: string;
}

@Injectable()
export class DepositMatchingService {
  private readonly logger = new Logger(DepositMatchingService.name);

  constructor(
    @InjectRepository(PaymentEvidence)
    private readonly evidenceRepo: Repository<PaymentEvidence>,
    @InjectRepository(PaymentRequest)
    private readonly requestRepo: Repository<PaymentRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject(forwardRef(() => WalletService))
    private readonly walletService: WalletService,
  ) {}

  /**
   * Evaluates an incoming evidence record against all currently PENDING deposit requests.
   * If a high-confidence match (>= 80%) is found, links them automatically.
   */
  async processIncomingEvidence(evidence: PaymentEvidence): Promise<PaymentEvidence> {
    if (evidence.status === PaymentEvidenceStatus.PROCESSED) {
      return evidence;
    }

    // 1. Fetch pending deposits
    const pendingDeposits = await this.requestRepo.find({
      where: {
        requestType: PaymentRequestType.DEPOSIT,
        status: PaymentRequestStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    if (pendingDeposits.length === 0) {
      this.logger.log(`Evidence #${evidence.id} stored. No pending deposits to match.`);
      return evidence;
    }

    // 2. Score candidates
    const candidates: MatchCandidate[] = [];

    for (const dep of pendingDeposits) {
      const match = await this.calculateMatchScore(dep, evidence);
      if (match.confidence > 0) {
        candidates.push({
          deposit: dep,
          confidence: match.confidence,
          reason: match.reason,
        });
      }
    }

    // Sort by highest confidence descending
    candidates.sort((a, b) => b.confidence - a.confidence);

    const best = candidates[0];
    if (best && best.confidence >= 80) {
      // Auto-link evidence to deposit request
      evidence.status = PaymentEvidenceStatus.MATCHED;
      evidence.matchedPaymentRequestId = best.deposit.id;
      evidence.matchConfidence = best.confidence;
      evidence.matchReason = best.reason;
      await this.evidenceRepo.save(evidence);

      best.deposit.matchedEvidenceId = evidence.id;
      best.deposit.matchConfidence = best.confidence;
      best.deposit.matchReason = best.reason;
      if (!best.deposit.transactionReference && evidence.parsedTransactionRef) {
        best.deposit.transactionReference = evidence.parsedTransactionRef;
      }
      await this.requestRepo.save(best.deposit);

      this.logger.log(
        `AUTO-MATCHED: Evidence #${evidence.id} linked to Deposit #${best.deposit.id} (Confidence: ${best.confidence}%, Reason: ${best.reason})`,
      );

      // Auto-approve if deposit is <= 200 ETB (20,000 minor units)
      const depositMinor = best.deposit.amountMinor ? BigInt(best.deposit.amountMinor) : 0n;
      const autoApproveLimit = BigInt(process.env.AUTO_APPROVE_MAX_MINOR || '20000');
      if (
        depositMinor > 0n &&
        depositMinor <= autoApproveLimit &&
        best.deposit.status === PaymentRequestStatus.PENDING
      ) {
        try {
          this.logger.log(
            `AUTO-APPROVING Deposit #${best.deposit.id} (Amount: ${best.deposit.amountMinor} minor <= ${autoApproveLimit}, Confidence: ${best.confidence}%)`,
          );
          await this.walletService.approveDeposit(
            best.deposit.id,
            '00000000-0000-0000-0000-000000000000',
            `Auto-approved: Confirmed via SMS matching (${best.reason}) under 200 ETB limit`,
          );
          evidence.status = PaymentEvidenceStatus.PROCESSED;
          await this.evidenceRepo.save(evidence);
        } catch (err: any) {
          this.logger.error(
            `Auto-approval failed for deposit #${best.deposit.id}: ${err.message}`,
            err.stack,
          );
        }
      }
    } else {
      this.logger.log(
        `Evidence #${evidence.id} evaluated. No candidate reached >= 80% confidence threshold (Best: ${best?.confidence || 0}%). Stored as UNMATCHED.`,
      );
    }

    return evidence;
  }

  /**
   * Called when a player creates a deposit or submits their transaction reference code.
   * Searches UNMATCHED evidence in the database to see if matching notification arrived earlier.
   */
  async matchPendingDeposit(deposit: PaymentRequest): Promise<PaymentRequest> {
    if (deposit.status !== PaymentRequestStatus.PENDING || deposit.matchedEvidenceId) {
      return deposit;
    }

    const unmatchedEvidence = await this.evidenceRepo.find({
      where: { status: PaymentEvidenceStatus.UNMATCHED },
      order: { receivedAt: 'DESC' },
      take: 50,
    });

    let bestEvidence: PaymentEvidence | null = null;
    let highestScore = 0;
    let bestReason = '';

    for (const ev of unmatchedEvidence) {
      const { confidence, reason } = await this.calculateMatchScore(deposit, ev);
      if (confidence > highestScore) {
        highestScore = confidence;
        highestScore = confidence;
        bestEvidence = ev;
        bestReason = reason;
      }
    }

    if (bestEvidence && highestScore >= 80) {
      bestEvidence.status = PaymentEvidenceStatus.MATCHED;
      bestEvidence.matchedPaymentRequestId = deposit.id;
      bestEvidence.matchConfidence = highestScore;
      bestEvidence.matchReason = bestReason;
      await this.evidenceRepo.save(bestEvidence);

      deposit.matchedEvidenceId = bestEvidence.id;
      deposit.matchConfidence = highestScore;
      deposit.matchReason = bestReason;
      if (!deposit.transactionReference && bestEvidence.parsedTransactionRef) {
        deposit.transactionReference = bestEvidence.parsedTransactionRef;
      }
      return this.requestRepo.save(deposit);
    }

    return deposit;
  }

  /**
   * Computes a match confidence score between a deposit request and payment evidence.
   */
  private async calculateMatchScore(
    deposit: PaymentRequest,
    evidence: PaymentEvidence,
  ): Promise<{ confidence: number; reason: string }> {
    const depositRef = (deposit.transactionReference || '').trim().toUpperCase();
    const evidenceRef = (evidence.parsedTransactionRef || '').trim().toUpperCase();

    // 1. Exact Reference Match (100% confidence)
    if (depositRef && evidenceRef && (depositRef === evidenceRef || depositRef.includes(evidenceRef) || evidenceRef.includes(depositRef))) {
      return {
        confidence: 100,
        reason: `Exact transaction reference match (${depositRef})`,
      };
    }

    const depositProvider = mapMethodToProviderName(deposit.paymentMethod);
    const evidenceProvider = evidence.provider;
    const sameProvider = depositProvider === evidenceProvider;

    // Check Amount match
    const amountMatches =
      deposit.amountMinor &&
      evidence.parsedAmountMinor &&
      BigInt(deposit.amountMinor) === BigInt(evidence.parsedAmountMinor);

    if (!amountMatches) {
      return { confidence: 0, reason: 'Amounts do not match' };
    }

    // Amount matches! Let's check user's phone / account details
    const user = await this.userRepo.findOne({ where: { id: deposit.userId } });
    const userPhone = user?.phone ? user.phone.replace(/[\s\+]/g, '') : null;
    const evidencePhone = evidence.parsedSenderPhone
      ? evidence.parsedSenderPhone.replace(/[\s\+]/g, '')
      : null;

    let phoneMatches = false;
    if (userPhone && evidencePhone) {
      if (userPhone === evidencePhone || userPhone.includes(evidencePhone) || evidencePhone.includes(userPhone)) {
        phoneMatches = true;
      } else if (evidencePhone.includes('*') || evidencePhone.toLowerCase().includes('x')) {
        // Handle masked phone numbers like 2519****5316 or 09****5316
        const maskedMatch = evidencePhone.match(/^([0-9]+)[*xX]+([0-9]+)$/);
        if (maskedMatch && maskedMatch[1] && maskedMatch[2]) {
          const prefix = maskedMatch[1];
          const suffix = maskedMatch[2];
          const normPrefix = prefix.startsWith('251') ? '0' + prefix.slice(3) : prefix;
          const normUser = userPhone.startsWith('251') ? '0' + userPhone.slice(3) : userPhone;
          const userEndsWith = userPhone.endsWith(suffix);
          const userStartsWith = normUser.startsWith(normPrefix) || userPhone.startsWith(prefix);
          if (userEndsWith && userStartsWith) {
            phoneMatches = true;
          }
        }
      }
    }

    if (sameProvider && phoneMatches) {
      return {
        confidence: 95,
        reason: `Exact amount, matching provider (${evidenceProvider}) and customer phone (${userPhone})`,
      };
    }

    // Check time window (within 3 hours of deposit request)
    const timeDiffMs = Math.abs(
      new Date(deposit.createdAt).getTime() - new Date(evidence.receivedAt).getTime(),
    );
    const isWithin3Hours = timeDiffMs <= 3 * 3600 * 1000;

    // If sender phone does not match and no transaction reference was provided:
    // This is AMBIGUOUS because multiple players could request the exact same deposit amount.
    // We cap confidence at 50% so it NEVER auto-approves without:
    // 1) Exact Transaction Reference (100% confidence), OR
    // 2) Matching Registered Customer Phone Number (95% confidence).
    if (sameProvider && isWithin3Hours) {
      const mins = Math.round(timeDiffMs / 60000);
      return {
        confidence: 50,
        reason: `Exact amount and provider match (${evidenceProvider}) within ${mins}m, but customer phone did not match and no transaction reference provided (awaiting ref code or admin review)`,
      };
    }

    if (sameProvider) {
      return {
        confidence: 40,
        reason: `Exact amount and provider match (${evidenceProvider}), but time offset > 3h and phone did not match`,
      };
    }

    return {
      confidence: 30,
      reason: 'Amount matches but provider or time window differ',
    };
  }

  /**
   * Admin manually links an evidence record to a pending deposit.
   */
  async manualLinkEvidence(
    depositId: string,
    evidenceId: string,
    adminUserId: string,
  ): Promise<{ deposit: PaymentRequest; evidence: PaymentEvidence }> {
    const deposit = await this.requestRepo.findOne({ where: { id: depositId } });
    if (!deposit) throw new NotFoundException(`Deposit request #${depositId} not found`);

    const evidence = await this.evidenceRepo.findOne({ where: { id: evidenceId } });
    if (!evidence) throw new NotFoundException(`Evidence #${evidenceId} not found`);

    deposit.matchedEvidenceId = evidence.id;
    deposit.matchConfidence = 100;
    deposit.matchReason = `Manually linked by admin (${adminUserId})`;
    if (!deposit.transactionReference && evidence.parsedTransactionRef) {
      deposit.transactionReference = evidence.parsedTransactionRef;
    }
    const savedDeposit = await this.requestRepo.save(deposit);

    evidence.status = PaymentEvidenceStatus.MATCHED;
    evidence.matchedPaymentRequestId = deposit.id;
    evidence.matchConfidence = 100;
    evidence.matchReason = `Manually linked by admin (${adminUserId})`;
    const savedEvidence = await this.evidenceRepo.save(evidence);

    this.logger.log(
      `Admin ${adminUserId} manually linked Evidence #${evidence.id} to Deposit #${deposit.id}`,
    );

    return { deposit: savedDeposit, evidence: savedEvidence };
  }

  /**
   * Admin unlinks evidence from a pending deposit.
   */
  async unlinkEvidence(depositId: string): Promise<PaymentRequest> {
    const deposit = await this.requestRepo.findOne({ where: { id: depositId } });
    if (!deposit) throw new NotFoundException(`Deposit request #${depositId} not found`);

    if (deposit.matchedEvidenceId) {
      const evidence = await this.evidenceRepo.findOne({
        where: { id: deposit.matchedEvidenceId },
      });
      if (evidence && evidence.status === PaymentEvidenceStatus.MATCHED) {
        evidence.status = PaymentEvidenceStatus.UNMATCHED;
        evidence.matchedPaymentRequestId = undefined;
        evidence.matchConfidence = undefined;
        evidence.matchReason = undefined;
        await this.evidenceRepo.save(evidence);
      }
    }

    deposit.matchedEvidenceId = undefined;
    deposit.matchConfidence = undefined;
    deposit.matchReason = undefined;
    return this.requestRepo.save(deposit);
  }

  /**
   * Fetches all evidence items with optional status filtering.
   */
  async getEvidence(status?: PaymentEvidenceStatus, limit = 100): Promise<PaymentEvidence[]> {
    const query = this.evidenceRepo.createQueryBuilder('evidence');
    if (status) {
      query.where('evidence.status = :status', { status });
    }
    query.orderBy('evidence.receivedAt', 'DESC').take(limit);
    return query.getMany();
  }
}
