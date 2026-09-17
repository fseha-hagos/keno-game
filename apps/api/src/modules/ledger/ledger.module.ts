import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerTransaction } from '../../database/entities/ledger-transaction.entity';
import { WalletAccount } from '../../database/entities/wallet-account.entity';
import { LedgerService } from './ledger.service';

@Module({
  imports: [TypeOrmModule.forFeature([LedgerTransaction, WalletAccount])],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
