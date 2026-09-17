import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletAccount } from '../../database/entities/wallet-account.entity';
import { LedgerService } from '../ledger/ledger.service';
import { TransactionType, LedgerReferenceType } from '@keno/shared-types';
import { GAME_CONFIG } from '@keno/config';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(WalletAccount)
    private readonly walletRepo: Repository<WalletAccount>,
    private readonly ledgerService: LedgerService,
  ) {}

  async getOrCreateWallet(userId: string, currency = GAME_CONFIG.DEFAULT_CURRENCY): Promise<WalletAccount> {
    let wallet = await this.walletRepo.findOne({
      where: { userId, currency },
    });

    if (!wallet) {
      wallet = this.walletRepo.create({
        userId,
        currency,
        balanceMinor: '0',
        lockedMinor: '0',
        status: 'ACTIVE',
      });
      wallet = await this.walletRepo.save(wallet);
    }

    return wallet;
  }

  async getWalletByUserId(userId: string, currency = GAME_CONFIG.DEFAULT_CURRENCY): Promise<WalletAccount> {
    const wallet = await this.getOrCreateWallet(userId, currency);
    return wallet;
  }

  async deposit(
    userId: string,
    amountMinor: string,
    currency = GAME_CONFIG.DEFAULT_CURRENCY,
    idempotencyKey?: string,
  ) {
    const wallet = await this.getOrCreateWallet(userId, currency);
    return this.ledgerService.recordTransaction({
      walletId: wallet.id,
      transactionType: TransactionType.DEPOSIT,
      amountMinor, // Positive
      currency,
      referenceType: LedgerReferenceType.DEPOSIT,
      idempotencyKey,
    });
  }

  async withdraw(
    userId: string,
    amountMinor: string,
    currency = GAME_CONFIG.DEFAULT_CURRENCY,
    idempotencyKey?: string,
  ) {
    const wallet = await this.getOrCreateWallet(userId, currency);
    return this.ledgerService.recordTransaction({
      walletId: wallet.id,
      transactionType: TransactionType.WITHDRAWAL,
      amountMinor: (-BigInt(amountMinor)).toString(), // Negative for debit
      currency,
      referenceType: LedgerReferenceType.WITHDRAWAL,
      idempotencyKey,
    });
  }

  async getTransactions(userId: string, currency = GAME_CONFIG.DEFAULT_CURRENCY) {
    const wallet = await this.getOrCreateWallet(userId, currency);
    return this.ledgerService.getTransactions(wallet.id);
  }
}
