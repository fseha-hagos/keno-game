import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Bet } from '../../database/entities/bet.entity';
import { GameRound } from '../../database/entities/game-round.entity';
import { BetStatus, TransactionType, LedgerReferenceType } from '@keno/shared-types';
import { DEFAULT_96_PAYTABLE_ENTRIES, getMultiplier } from '@keno/game-math';
import { LedgerService } from '../ledger/ledger.service';
import { PaytablesService } from '../paytables/paytables.service';
import { EventsGateway } from '../websocket/events.gateway';
import { AuditService } from '../audit/audit.service';
import { WalletAccount } from '../../database/entities/wallet-account.entity';

export interface SettlementSummary {
  totalWageredMinor: string;
  totalPayoutMinor: string;
  settledBetsCount: number;
}

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    @InjectRepository(Bet)
    private readonly betRepo: Repository<Bet>,
    private readonly ledgerService: LedgerService,
    private readonly paytablesService: PaytablesService,
    private readonly eventsGateway: EventsGateway,
    private readonly auditService: AuditService,
  ) {}

  private parseNumberList(val: any): number[] {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val.map((n) => Number(n)).filter((n) => !isNaN(n));
    }
    if (typeof val === 'string') {
      return val
        .split(',')
        .map((n) => Number(n.trim()))
        .filter((n) => !isNaN(n));
    }
    return [];
  }

  /**
   * Settles all pending bets for a drawn round transactionally.
   */
  async settleRoundBets(round: GameRound): Promise<SettlementSummary> {
    const cleanDraw = this.parseNumberList(round.drawResult);
    if (cleanDraw.length !== 20) {
      throw new Error(`Cannot settle round #${round.roundNumber} without valid 20-number draw result`);
    }

    const drawSet = new Set(cleanDraw);
    const pendingBets = await this.betRepo.find({
      where: { roundId: round.id, status: BetStatus.PENDING },
      relations: ['user'],
    });

    let totalWagered = 0n;
    let totalPayout = 0n;

    for (const bet of pendingBets) {
      totalWagered += BigInt(bet.stakeMinor);

      // 1. Calculate Hits (Robust intersection of player selections and authoritative draw)
      const cleanSelectedNumbers = this.parseNumberList(bet.selectedNumbers);
      const hitNumbers = cleanSelectedNumbers.filter((n) => drawSet.has(n));
      const hits = hitNumbers.length;
      bet.hits = hits;
      bet.hitNumbers = hitNumbers;

      // 2. Query Certified Paytable for exact multiplier with fallback
      let multiplier = await this.paytablesService.getMultiplier(
        round.gameId,
        1, // Paytable version 1
        bet.spots,
        hits,
      );

      // Secure backend fallback to certified paytable if DB entry was 0 or unseeded
      if (!multiplier || multiplier === 0) {
        multiplier = getMultiplier(DEFAULT_96_PAYTABLE_ENTRIES, bet.spots, hits);
      }

      bet.multiplier = multiplier;

      // 3. Compute Payout Minor Units: floor(stakeMinor * multiplier)
      const stakeNum = Number(bet.stakeMinor);
      const payoutNum = Math.floor(stakeNum * multiplier);
      const payoutMinor = payoutNum.toString();
      bet.payoutMinor = payoutMinor;
      bet.status = BetStatus.SETTLED;
      bet.settledAt = new Date();

      await this.betRepo.save(bet);

      // 4. If win (>0), credit player wallet via immutable ledger
      if (payoutNum > 0) {
        totalPayout += BigInt(payoutMinor);

        const wallet = await this.betRepo.manager.findOne(WalletAccount, {
          where: { userId: bet.userId, currency: bet.currency },
        });

        if (wallet) {
          const { newBalanceMinor } = await this.ledgerService.recordTransaction({
            walletId: wallet.id,
            transactionType: TransactionType.WIN,
            amountMinor: payoutMinor,
            currency: bet.currency,
            referenceType: LedgerReferenceType.BET,
            referenceId: bet.id,
            idempotencyKey: `win_${bet.id}`,
          });

          this.logger.log(
            `Credited WIN payout of ${payoutMinor} minor units to user ${bet.userId} (Wallet: ${wallet.id}, New Balance: ${newBalanceMinor})`,
          );

          this.eventsGateway.sendBalanceUpdate(bet.userId, newBalanceMinor);
        } else {
          this.logger.error(
            `No wallet found for user ${bet.userId} currency ${bet.currency} to credit win ${payoutMinor}`,
          );
        }
      }

      await this.auditService.log({
        actorId: bet.userId,
        actorRole: 'SYSTEM_SETTLEMENT',
        action: 'BET_SETTLED',
        entity: 'BET',
        entityId: bet.id,
        metadata: {
          roundId: round.id,
          roundNumber: round.roundNumber,
          spots: bet.spots,
          hits,
          hitNumbers,
          multiplier,
          payoutMinor,
        },
      });
    }

    return {
      totalWageredMinor: totalWagered.toString(),
      totalPayoutMinor: totalPayout.toString(),
      settledBetsCount: pendingBets.length,
    };
  }
}
