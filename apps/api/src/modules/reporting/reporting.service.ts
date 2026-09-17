import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameRound } from '../../database/entities/game-round.entity';
import { Bet } from '../../database/entities/bet.entity';
import { DEFAULT_PAYTABLE_VERSION } from '@keno/game-math';
import { RtpReportDto, BetStatus } from '@keno/shared-types';
import { GAME_CONFIG } from '@keno/config';

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(GameRound)
    private readonly roundRepo: Repository<GameRound>,
    @InjectRepository(Bet)
    private readonly betRepo: Repository<Bet>,
  ) {}

  async getRtpReport(): Promise<RtpReportDto> {
    const settledBets = await this.betRepo.find({
      where: { status: BetStatus.SETTLED },
    });

    let totalWagers = 0n;
    let totalPayouts = 0n;
    const hitCountBySpot: Record<number, Record<number, number>> = {};

    for (const bet of settledBets) {
      totalWagers += BigInt(bet.stakeMinor);
      if (bet.payoutMinor) {
        totalPayouts += BigInt(bet.payoutMinor);
      }

      const spots = bet.spots;
      const hits = bet.hits || 0;
      if (!hitCountBySpot[spots]) {
        hitCountBySpot[spots] = {};
      }
      hitCountBySpot[spots][hits] = (hitCountBySpot[spots][hits] || 0) + 1;
    }

    const totalRounds = await this.roundRepo.count();
    const observedRtp =
      totalWagers > 0n ? Number(totalPayouts) / Number(totalWagers) : 0;
    const houseProfit = totalWagers - totalPayouts;

    return {
      gameVersionId: GAME_CONFIG.DEFAULT_GAME_VERSION_ID,
      paytableVersionId: DEFAULT_PAYTABLE_VERSION.id,
      theoreticalRtp: DEFAULT_PAYTABLE_VERSION.theoreticalRtp,
      observedRtp,
      totalWagersMinor: totalWagers.toString(),
      totalPayoutsMinor: totalPayouts.toString(),
      totalRounds,
      totalBets: settledBets.length,
      houseProfitMinor: houseProfit.toString(),
      hitCountBySpot,
    };
  }
}
