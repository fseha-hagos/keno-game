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
import { User } from '../../database/entities/user.entity';
import { BetStatus, RoundStatus, TransactionType, LedgerReferenceType, UserStatus } from '@keno/shared-types';
import { LedgerService } from '../ledger/ledger.service';
import { ResponsibleGamblingService } from '../responsible-gambling/responsible-gambling.service';
import { AuditService } from '../audit/audit.service';
import { AdminService } from '../admin/admin.service';
import { PlaceBetInput } from '@keno/validation';
import { GAME_CONFIG } from '@keno/config';

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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly ledgerService: LedgerService,
    private readonly rgService: ResponsibleGamblingService,
    private readonly auditService: AuditService,
    private readonly adminService: AdminService,
  ) {}

  async placeBet(userId: string, input: PlaceBetInput): Promise<Bet> {
    // 0. Global System Status & Maintenance Check
    if (!this.adminService.isSystemActive()) {
      throw new BadRequestException(
        'The game system is currently undergoing maintenance. Betting is temporarily paused.',
      );
    }

    // Check if player account is frozen or suspended
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user && (user.status === UserStatus.FROZEN || user.status === UserStatus.SUSPENDED)) {
      throw new BadRequestException('Your account has been frozen or suspended. Please contact support.');
    }

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

    // 3. Minimum & Maximum Stake Check (2.00 - 4,000.00 ETB)
    if (BigInt(input.stakeMinor) < BigInt(GAME_CONFIG.MIN_STAKE_MINOR)) {
      throw new BadRequestException('Minimum bet amount is 2.00 ETB');
    }
    if (BigInt(input.stakeMinor) > BigInt(GAME_CONFIG.MAX_STAKE_MINOR)) {
      throw new BadRequestException('Maximum bet amount is 4,000.00 ETB');
    }

    // 4. Responsible Gambling Limits Check
    await this.rgService.assertCanPlaceBet(userId, input.stakeMinor);

    // 4. Validate Selection Properties
    const spots = input.selectedNumbers.length;
    if (spots < GAME_CONFIG.MIN_SPOTS || spots > GAME_CONFIG.MAX_SPOTS) {
      throw new BadRequestException(
        `Must select between ${GAME_CONFIG.MIN_SPOTS} and ${GAME_CONFIG.MAX_SPOTS} numbers`,
      );
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
        selectedNumbers: input.selectedNumbers.sort((a: number, b: number) => a - b),
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

  async getRecentBets(limit = 30): Promise<Bet[]> {
    return this.betRepo.find({
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
