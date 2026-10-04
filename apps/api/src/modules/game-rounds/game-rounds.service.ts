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

  // In-memory map to track active drawing progress step-by-step
  private activeDraws = new Map<
    string,
    { fullDraw: number[]; revealed: number[]; hash: string }
  >();

  constructor(
    @InjectRepository(GameRound)
    private readonly roundRepo: Repository<GameRound>,
    private readonly rngService: RngService,
    private readonly eventsGateway: EventsGateway,
    private readonly settlementService: SettlementService,
  ) {}

  async onModuleInit() {
    await this.ensureActiveRound();
    // Start automated round tick loop (1 second heartbeat)
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

    // SECURITY & LIVE SYNC: If round is currently drawing, return ONLY revealed numbers so far
    if (round && this.activeDraws.has(round.id)) {
      const active = this.activeDraws.get(round.id)!;
      return {
        ...round,
        drawResult: [...active.revealed],
      } as GameRound;
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
    const round = await this.roundRepo.findOne({ where: { id } });
    if (round && this.activeDraws.has(round.id)) {
      const active = this.activeDraws.get(round.id)!;
      return {
        ...round,
        drawResult: [...active.revealed],
      } as GameRound;
    }
    return round;
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
   * 2. If so, CLOSE betting -> generate CSPRNG DRAW -> broadcast balls one by one -> SETTLE -> create next round.
   */
  private async tickRoundLifecycle() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;
      const now = new Date();

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

    // 2. Generate Authoritative CSPRNG Draw internally
    const drawResult = this.rngService.generateAuthoritativeDraw();
    this.logger.log(`Round #${round.roundNumber} CSPRNG draw generated internally.`);

    // Set round status to DRAWN, but DO NOT save full drawResult to DB yet
    round.status = RoundStatus.DRAWN;
    round.drawResult = []; // Keep empty in DB during drawing phase
    round.resultHash = drawResult.hash;
    await this.roundRepo.save(round);

    // Track active drawing in memory
    this.activeDraws.set(round.id, {
      fullDraw: drawResult.draw,
      revealed: [],
      hash: drawResult.hash,
    });

    this.eventsGateway.broadcastDrawStarted(round.id);

    // Emit numbers ONE BY ONE at server intervals (1600ms per ball)
    for (let i = 0; i < drawResult.draw.length; i++) {
      const ball = drawResult.draw[i]!;
      const active = this.activeDraws.get(round.id);
      if (active) {
        active.revealed.push(ball);
      }
      const revealedSoFar = active ? [...active.revealed] : [ball];

      this.eventsGateway.broadcastNumberDrawn(round.id, ball, i + 1, revealedSoFar);
      await new Promise((resolve) => setTimeout(resolve, GAME_CONFIG.BALL_DRAW_ANIMATION_DELAY_MS));
    }

    // 3. Drawing complete — save full 20 numbers to DB and settle bets
    round.drawResult = drawResult.draw;
    const settlementSummary = await this.settlementService.settleRoundBets(round);

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

    this.activeDraws.delete(round.id);

    // 4. 3s display hold for win settlement announcement before opening next round
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 5. Open next round immediately so the 60s countdown starts
    await this.ensureActiveRound();
  }
}
