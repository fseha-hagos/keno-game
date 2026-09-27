import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletAccount } from '../../database/entities/wallet-account.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

import { PaymentRequest } from '../../database/entities/payment-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WalletAccount, PaymentRequest]), LedgerModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
