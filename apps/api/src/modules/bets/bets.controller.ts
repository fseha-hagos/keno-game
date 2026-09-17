import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BetsService } from './bets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlaceBetInput } from '@keno/validation';

@ApiTags('Bets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/keno/bets')
export class BetsController {
  constructor(private readonly betsService: BetsService) {}

  @Post()
  @ApiOperation({ summary: 'Place an authoritative bet for the active round' })
  async placeBet(@Request() req: any, @Body() body: PlaceBetInput) {
    return this.betsService.placeBet(req.user.id, body);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get bet history for current authenticated player' })
  async getHistory(@Request() req: any) {
    return this.betsService.getUserBets(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details and settlement of a specific bet' })
  async getBetById(@Param('id') id: string) {
    return this.betsService.getBetById(id);
  }
}
