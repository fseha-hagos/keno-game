import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { GameRound } from '../../database/entities/game-round.entity';
import { RoundStatus } from '@keno/shared-types';
import { RngService } from '../rng/rng.service';
import { EventsGateway } from '../websocket/events.gateway';
import { SettlementService } from '../settlement/settlement.service';
import { GAME_CONFIG } from '@keno/config';

@Injectable()
export class GameRoundsService implements OnModuleInit {
  private readonly logger = new Logger(GameRoundsService.name);
  private isProcessing = false;

  constructor(
    @InjectRepository(GameRound)
    private readonly roundRepo: Repository<GameRound>,
    private readonly rngService: RngService,
    private readonly eventsGateway: EventsGateway,
    private readonly settlementService: SettlementService,
  ) {}

  async onModuleInit() {
    await this.ensureActiveRound();
    // Start automated round tick loop (1 second heartbeat for exact countdown precision)
    setInterval(() => this.tickRoundLifecycle(), 1000);
  }

  async getCurrentRound(): Promise<GameRound> {
    let round = await this.roundRepo.findOne({
      where: { status: RoundStatus.OPEN },
      order: { roundNumber: 'DESC' },
    });

    // If no OPEN round exists right now (e.g., during drawing & settlement phase),
    // return the currently active drawing/settled round instead of prematurely creating a new one.
    if (!round) {
      round = await this.roundRepo.findOne({
        where: {},
        order: { roundNumber: 'DESC' },
      });
    }

    if (!round) {
      round = await this.ensureActiveRound();
    }

    return round;
  }

  async getRecentRounds(limit = 20): Promise<GameRound[]> {
    return this.roundRepo.find({
      order: { roundNumber: 'DESC' },
      take: limit,
    });
  }

  async getRoundById(id: string): Promise<GameRound | null> {
    return this.roundRepo.findOne({ where: { id } });
  }

  private async ensureActiveRound(): Promise<GameRound> {
    const existingOpen = await this.roundRepo.findOne({
      where: { status: RoundStatus.OPEN },
    });
    if (existingOpen) {
      return existingOpen;
    }

    const now = new Date();
    const scheduledClose = new Date(
      now.getTime() + GAME_CONFIG.ROUND_BETTING_WINDOW_SECONDS * 1000,
    );

    const latestRound = await this.roundRepo.findOne({
      where: {},
      order: { roundNumber: 'DESC' },
    });
    const nextRoundNumber = (latestRound ? Number(latestRound.roundNumber) : 0) + 1;

    const newRound = this.roundRepo.create({
      roundNumber: nextRoundNumber,
      gameId: GAME_CONFIG.DEFAULT_GAME_ID,
      gameVersionId: GAME_CONFIG.DEFAULT_GAME_VERSION_ID,
      status: RoundStatus.OPEN,
      scheduledAt: now,
      openedAt: now,
      closedAt: scheduledClose,
      totalWageredMinor: '0',
      totalPayoutMinor: '0',
    });

    const saved = await this.roundRepo.save(newRound);
    this.logger.log(`Created & Opened Round #${saved.roundNumber} (ID: ${saved.id})`);
    this.eventsGateway.broadcastRoundOpened({
      id: saved.id,
      roundNumber: saved.roundNumber,
      status: saved.status,
      closedAt: saved.closedAt,
    });

    return saved;
  }

  /**
   * State Machine / Round Engine Heartbeat:
   * 1. Check if active OPEN round reached scheduled betting close time.
   * 2. If so, CLOSE betting -> generate CSPRNG DRAW -> broadcast balls -> SETTLE all bets -> create next round.
   */
  private async tickRoundLifecycle() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;
      const now = new Date();

      // Find any round that is OPEN and past its close time
      const roundToClose = await this.roundRepo.findOne({
        where: {
          status: RoundStatus.OPEN,
          closedAt: LessThanOrEqual(now),
        },
      });

      if (roundToClose) {
        await this.executeRoundDrawAndSettlement(roundToClose);
      }
    } catch (err: any) {
      this.logger.error(`Error in round tick: ${err.message}`, err.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeRoundDrawAndSettlement(round: GameRound) {
    this.logger.log(`Closing betting for Round #${round.roundNumber}...`);

    // 1. Mark round as CLOSED
    round.status = RoundStatus.CLOSED;
    await this.roundRepo.save(round);
    this.eventsGateway.broadcastRoundClosed(round.id);

    // 2. Generate Authoritative CSPRNG Draw
    const drawResult = this.rngService.generateAuthoritativeDraw();
    this.logger.log(`Round #${round.roundNumber} drawn: [${drawResult.draw.join(', ')}]`);

    round.status = RoundStatus.DRAWN;
    round.drawResult = drawResult.draw;
    round.resultHash = drawResult.hash;
    await this.roundRepo.save(round);

    this.eventsGateway.broadcastDrawStarted(round.id);

    // Broadcast individual balls drawn with animation interval (800ms per ball)
    for (let i = 0; i < drawResult.draw.length; i++) {
      const ball = drawResult.draw[i]!;
      this.eventsGateway.broadcastNumberDrawn(round.id, ball, i + 1);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    // 3. Settle all bets for this round transactionally
    const settlementSummary = await this.settlementService.settleRoundBets(round);

    // 4. Mark round as COMPLETED/SETTLED
    round.status = RoundStatus.SETTLED;
    round.completedAt = new Date();
    round.totalWageredMinor = settlementSummary.totalWageredMinor;
    round.totalPayoutMinor = settlementSummary.totalPayoutMinor;
    await this.roundRepo.save(round);

    this.logger.log(
      `Round #${round.roundNumber} SETTLED. Total Wagered: ${round.totalWageredMinor}, Total Payout: ${round.totalPayoutMinor}`,
    );

    this.eventsGateway.broadcastRoundCompleted({
      id: round.id,
      roundNumber: round.roundNumber,
      status: round.status,
      drawResult: round.drawResult,
      resultHash: round.resultHash,
      totalWageredMinor: round.totalWageredMinor,
      totalPayoutMinor: round.totalPayoutMinor,
    });

    // 5. Hold completed draw result on screen for 5s so players can see their hits and payouts
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 6. Open next round
    await this.ensureActiveRound();
  }
}
