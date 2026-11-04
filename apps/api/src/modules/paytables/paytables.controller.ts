import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaytablesService } from './paytables.service';
import { calculateOverallRtp, calculateSpotRtp, DEFAULT_96_PAYTABLE_ENTRIES } from '@keno/game-math';
import { GAME_CONFIG } from '@keno/config';

@ApiTags('Paytables & Math')
@Controller('api/v1/paytables')
export class PaytablesController {
  constructor(private readonly paytablesService: PaytablesService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get current active certified paytable' })
  async getActivePaytable(@Query('gameId') gameId?: string) {
    const targetGameId = gameId || GAME_CONFIG.DEFAULT_GAME_ID;
    const entries = await this.paytablesService.getActivePaytable(targetGameId);
    const parsedEntries = entries.length > 0
      ? entries.map((e) => ({
          spots: Number(e.spots),
          hits: Number(e.hits),
          multiplier: Number(e.multiplier),
          theoreticalRtp: Number(e.theoreticalRtp),
        }))
      : DEFAULT_96_PAYTABLE_ENTRIES;

    const first = entries[0];
    const targetRtp = first && first.theoreticalRtp ? Number(first.theoreticalRtp) : 96.0;

    return {
      gameId: targetGameId,
      targetRtp,
      entries: parsedEntries,
    };
  }

  @Get('analysis')
  @ApiOperation({ summary: 'Get mathematical RTP, volatility, and hit distribution analysis' })
  async getMathematicalAnalysis(@Query('spots') spotsParam?: string) {
    const entries = await this.paytablesService.getActivePaytable();
    const paytable = entries.length > 0
      ? entries.map((e) => ({
          spots: Number(e.spots),
          hits: Number(e.hits),
          multiplier: Number(e.multiplier),
        }))
      : DEFAULT_96_PAYTABLE_ENTRIES;

    if (spotsParam) {
      const spots = parseInt(spotsParam, 10);
      return calculateSpotRtp(spots, paytable);
    }
    return calculateOverallRtp(paytable, 1, 10);
  }
}
