import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Bet } from '../../database/entities/bet.entity';
import { GameRound } from '../../database/entities/game-round.entity';
import { WalletAccount } from '../../database/entities/wallet-account.entity';
import { BetStatus, RoundStatus, TransactionType, LedgerReferenceType } from '@keno/shared-types';
import { LedgerService } from '../ledger/ledger.service';
import { ResponsibleGamblingService } from '../responsible-gambling/responsible-gambling.service';
import { AuditService } from '../audit/audit.service';
import { PlaceBetInput } from '@keno/validation';

@Injectable()
export class BetsService {
  private readonly logger = new Logger(BetsService.name);

  constructor(
    @InjectRepository(Bet)
    private readonly betRepo: Repository<Bet>,
    @InjectRepository(GameRound)
    private readonly roundRepo: Repository<GameRound>,
    @InjectRepository(WalletAccount)
    private readonly walletRepo: Repository<WalletAccount>,
    private readonly ledgerService: LedgerService,
    private readonly rgService: ResponsibleGamblingService,
    private readonly auditService: AuditService,
  ) {}

  async placeBet(userId: string, input: PlaceBetInput): Promise<Bet> {
    // 1. Idempotency Check
    const existingBet = await this.betRepo.findOne({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existingBet) {
      this.logger.warn(`Idempotent bet request returned for key: ${input.idempotencyKey}`);
      return existingBet;
    }

    // 2. Validate Round State
    const round = await this.roundRepo.findOne({ where: { id: input.roundId } });
    if (!round) {
      throw new BadRequestException('Game round not found');
    }

    if (round.status !== RoundStatus.OPEN) {
      throw new BadRequestException(
        `Betting is closed for round #${round.roundNumber} (status: ${round.status})`,
      );
    }

    // 3. Responsible Gambling Limits Check
    await this.rgService.assertCanPlaceBet(userId, input.stakeMinor);

    // 4. Validate Selection Properties
    const spots = input.selectedNumbers.length;
    if (spots < 1 || spots > 10) {
      throw new BadRequestException('Must select between 1 and 10 numbers');
    }

    // 5. Atomic Transaction: Debit Wallet + Create Bet
    return this.betRepo.manager.transaction(async (manager: EntityManager) => {
      // Find wallet for user
      const wallet = await manager.findOne(WalletAccount, {
        where: { userId, currency: input.currency },
      });

      if (!wallet) {
        throw new BadRequestException(`No wallet found for currency: ${input.currency}`);
      }

      // Debit stake from wallet through ledger with pessimistic lock
      const { transaction: debitTx } = await this.ledgerService.recordTransaction(
        {
          walletId: wallet.id,
          transactionType: TransactionType.BET,
          amountMinor: (-BigInt(input.stakeMinor)).toString(), // Negative for debit
          currency: input.currency,
          referenceType: LedgerReferenceType.BET,
          idempotencyKey: `bet_debit_${input.idempotencyKey}`,
        },
        manager,
      );

      // Create Bet Entity
      const bet = manager.create(Bet, {
        userId,
        roundId: round.id,
        gameVersionId: round.gameVersionId,
        paytableVersionId: '00000000-0000-0000-0000-000000000001', // Default paytable v1
        stakeMinor: input.stakeMinor,
        currency: input.currency,
        selectedNumbers: input.selectedNumbers.sort((a, b) => a - b),
        spots,
        status: BetStatus.PENDING,
        idempotencyKey: input.idempotencyKey,
      });

      const savedBet = await manager.save(bet);

      // Update ledger reference to the newly created bet ID
      debitTx.referenceId = savedBet.id;
      await manager.save(debitTx);

      await this.auditService.log({
        actorId: userId,
        actorRole: 'PLAYER',
        action: 'BET_PLACED',
        entity: 'BET',
        entityId: savedBet.id,
        metadata: {
          roundId: round.id,
          roundNumber: round.roundNumber,
          spots,
          selectedNumbers: input.selectedNumbers,
          stakeMinor: input.stakeMinor,
          currency: input.currency,
        },
      });

      return savedBet;
    });
  }

  async getUserBets(userId: string, limit = 50): Promise<Bet[]> {
    return this.betRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['round'],
    });
  }

  async getBetById(id: string): Promise<Bet | null> {
    return this.betRepo.findOne({
      where: { id },
      relations: ['round'],
    });
  }
}
