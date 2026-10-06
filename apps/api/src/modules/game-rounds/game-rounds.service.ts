import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { GameRound } from '../../database/entities/game-round.entity';
import { RoundStatus } from '@keno/shared-types';
import { RngService } from '../rng/rng.service';
import { EventsGateway } from '../websocket/events.gateway';
import { SettlementService } from '../settlement/settlement.service';
import { GAME_CONFIG } from '@keno/config';

// Base traceable sequence offset (produces 6-digit official game IDs: 100001, 100002... or 102966)
const BASE_TRACEABLE_ROUND_OFFSET = 100000;

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
    await this.recoverAndEnsureActiveRound();
    // Start automated round tick loop (1 second heartbeat)
    setInterval(() => this.tickRoundLifecycle(), 1000);
  }

  async getCurrentRound(): Promise<GameRound> {
    // 1. Check for active OPEN round
    let round = await this.roundRepo.findOne({
      where: { status: RoundStatus.OPEN },
      order: { roundNumber: 'DESC' },
    });

    // 2. If no OPEN round, check if currently drawing in-memory
    if (!round && this.activeDraws.size > 0) {
      const activeRoundId = Array.from(this.activeDraws.keys())[0];
      if (activeRoundId) {
        round = await this.roundRepo.findOne({
          where: { id: activeRoundId },
        });
      }
    }

    // 3. If still no active round, immediately ensure a live round is open
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

  private async recoverAndEnsureActiveRound(): Promise<GameRound> {
    const now = new Date();

    // 1. Recover any stuck/orphaned rounds from previous process interrupts
    const stuckRounds = await this.roundRepo.find({
      where: [
        { status: RoundStatus.CLOSED },
        { status: RoundStatus.DRAWN },
      ],
      order: { roundNumber: 'DESC' },
    });

    for (const stuck of stuckRounds) {
      this.logger.warn(`Recovering stuck round #${stuck.roundNumber} (status: ${stuck.status})...`);
      if (!stuck.drawResult || stuck.drawResult.length < 20) {
        const fallbackDraw = this.rngService.generateAuthoritativeDraw();
        stuck.drawResult = fallbackDraw.draw;
        stuck.resultHash = fallbackDraw.hash;
      }
      try {
        const settlement = await this.settlementService.settleRoundBets(stuck);
        stuck.status = RoundStatus.SETTLED;
        stuck.completedAt = new Date();
        stuck.totalWageredMinor = settlement.totalWageredMinor;
        stuck.totalPayoutMinor = settlement.totalPayoutMinor;
        await this.roundRepo.save(stuck);
      } catch (e: any) {
        this.logger.error(`Recovery settlement error for round #${stuck.roundNumber}: ${e.message}`);
        stuck.status = RoundStatus.SETTLED;
        stuck.completedAt = new Date();
        await this.roundRepo.save(stuck);
      }
    }

    // 2. Check if an active OPEN round exists
    const existingOpen = await this.roundRepo.findOne({
      where: { status: RoundStatus.OPEN },
      order: { roundNumber: 'DESC' },
    });

    if (existingOpen) {
      if (existingOpen.closedAt && new Date(existingOpen.closedAt) <= now) {
        this.logger.log(`Existing OPEN round #${existingOpen.roundNumber} expired while offline. Executing draw...`);
        await this.executeRoundDrawAndSettlement(existingOpen);
      } else {
        return existingOpen;
      }
    }

    // 3. Ensure a brand new active round is running
    return this.ensureActiveRound();
  }

  private async ensureActiveRound(): Promise<GameRound> {
    const existingOpen = await this.roundRepo.findOne({
      where: { status: RoundStatus.OPEN },
      order: { roundNumber: 'DESC' },
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

    // Big 4+ digit traceable ID sequence (never resets to 1, forever continuing)
    let nextRoundNumber: number;
    if (latestRound && Number(latestRound.roundNumber) >= BASE_TRACEABLE_ROUND_OFFSET) {
      nextRoundNumber = Number(latestRound.roundNumber) + 1;
    } else if (latestRound && Number(latestRound.roundNumber) > 0) {
      // Seamlessly upgrade existing legacy count (e.g. 2965) into official 6-digit ID (102966)
      nextRoundNumber = BASE_TRACEABLE_ROUND_OFFSET + Number(latestRound.roundNumber) + 1;
    } else {
      nextRoundNumber = BASE_TRACEABLE_ROUND_OFFSET + 1;
    }

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
   * 1. Ensure an active OPEN round is always available (forever continuing, never dies).
   * 2. If active OPEN round reached scheduled betting close time:
   *    CLOSE betting -> CSPRNG DRAW -> broadcast balls one by one -> SETTLE -> open next round.
   */
  private async tickRoundLifecycle() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;
      const now = new Date();

      // Find active OPEN round
      const activeOpen = await this.roundRepo.findOne({
        where: { status: RoundStatus.OPEN },
        order: { roundNumber: 'DESC' },
      });

      if (!activeOpen) {
        // If an in-memory draw animation is currently active, allow it to complete
        if (this.activeDraws.size > 0) {
          return;
        }
        // No OPEN round and no active draw -> open the next round immediately
        await this.ensureActiveRound();
        return;
      }

      if (activeOpen.closedAt && new Date(activeOpen.closedAt) <= now) {
        await this.executeRoundDrawAndSettlement(activeOpen);
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
