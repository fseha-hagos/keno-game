import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from '../../database/entities/user.entity';
import { PaymentRequest } from '../../database/entities/payment-request.entity';
import { LedgerTransaction } from '../../database/entities/ledger-transaction.entity';
import { WalletAccount } from '../../database/entities/wallet-account.entity';
import { GameRound } from '../../database/entities/game-round.entity';
import { Bet } from '../../database/entities/bet.entity';
import { Paytable } from '../../database/entities/paytable.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      PaymentRequest,
      LedgerTransaction,
      WalletAccount,
      GameRound,
      Bet,
      Paytable,
      AuditLog,
    ]),
    AuditModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
