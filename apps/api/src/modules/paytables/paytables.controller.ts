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
    return {
      gameId: targetGameId,
      entries,
    };
  }

  @Get('analysis')
  @ApiOperation({ summary: 'Get mathematical RTP, volatility, and hit distribution analysis' })
  getMathematicalAnalysis(@Query('spots') spotsParam?: string) {
    if (spotsParam) {
      const spots = parseInt(spotsParam, 10);
      return calculateSpotRtp(spots, DEFAULT_96_PAYTABLE_ENTRIES);
    }
    return calculateOverallRtp(DEFAULT_96_PAYTABLE_ENTRIES, 1, 10);
  }
}
