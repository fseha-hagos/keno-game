import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameRound } from '../../database/entities/game-round.entity';
import { RngModule } from '../rng/rng.module';
import { SettlementModule } from '../settlement/settlement.module';
import { GameRoundsService } from './game-rounds.service';
import { GameRoundsController } from './game-rounds.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GameRound]), RngModule, SettlementModule],
  controllers: [GameRoundsController],
  providers: [GameRoundsService],
  exports: [GameRoundsService],
})
export class GameRoundsModule {}
