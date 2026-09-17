import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GameRoundsService } from './game-rounds.service';

@ApiTags('Game Rounds')
@Controller('api/v1/keno/rounds')
export class GameRoundsController {
  constructor(private readonly roundsService: GameRoundsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current active open betting round' })
  async getCurrentRound() {
    return this.roundsService.getCurrentRound();
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get list of recent game rounds and draw results' })
  async getRecentRounds() {
    return this.roundsService.getRecentRounds();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details and draw result of a specific round' })
  async getRoundById(@Param('id') id: string) {
    return this.roundsService.getRoundById(id);
  }
}
