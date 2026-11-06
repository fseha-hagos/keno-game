import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletAccount } from '../../database/entities/wallet-account.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { TelegramNotificationService } from './telegram-notification.service';
import { PaymentRequest } from '../../database/entities/payment-request.entity';
import { PaymentEvidence } from '../../database/entities/payment-evidence.entity';
import { AgentProfile } from '../../database/entities/agent-profile.entity';
import { User } from '../../database/entities/user.entity';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WalletAccount,
      PaymentRequest,
      PaymentEvidence,
      AgentProfile,
      User,
    ]),
    LedgerModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [WalletController],
  providers: [WalletService, TelegramNotificationService],
  exports: [WalletService, TelegramNotificationService],
})
export class WalletModule {}
