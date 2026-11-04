import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bet } from '../../database/entities/bet.entity';
import { GameRound } from '../../database/entities/game-round.entity';
import { WalletAccount } from '../../database/entities/wallet-account.entity';
import { User } from '../../database/entities/user.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { ResponsibleGamblingModule } from '../responsible-gambling/responsible-gambling.module';
import { AdminModule } from '../admin/admin.module';
import { BetsService } from './bets.service';
import { BetsController } from './bets.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bet, GameRound, WalletAccount, User]),
    LedgerModule,
    ResponsibleGamblingModule,
    forwardRef(() => AdminModule),
  ],
  controllers: [BetsController],
  providers: [BetsService],
  exports: [BetsService],
})
export class BetsModule {}
