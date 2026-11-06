import { Module, forwardRef } from '@nestjs/common';
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
import { AgentProfile } from '../../database/entities/agent-profile.entity';
import { AuditModule } from '../audit/audit.module';
import { LedgerModule } from '../ledger/ledger.module';
import { WalletModule } from '../wallet/wallet.module';

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
      AgentProfile,
    ]),
    AuditModule,
    LedgerModule,
    forwardRef(() => WalletModule),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
