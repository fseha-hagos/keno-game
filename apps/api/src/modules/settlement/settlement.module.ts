import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bet } from '../../database/entities/bet.entity';
import { GameRound } from '../../database/entities/game-round.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { PaytablesModule } from '../paytables/paytables.module';
import { SettlementService } from './settlement.service';

@Module({
  imports: [TypeOrmModule.forFeature([Bet, GameRound]), LedgerModule, PaytablesModule],
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementModule {}
