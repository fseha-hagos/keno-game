import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { LedgerTransaction } from '../../database/entities/ledger-transaction.entity';
import { WalletAccount } from '../../database/entities/wallet-account.entity';
import { TransactionType, LedgerReferenceType } from '@keno/shared-types';

export interface PostTransactionParams {
  walletId: string;
  transactionType: TransactionType;
  amountMinor: string; // Positive for credit, negative for debit
  currency: string;
  referenceType?: LedgerReferenceType;
  referenceId?: string;
  idempotencyKey?: string;
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    @InjectRepository(LedgerTransaction)
    private readonly ledgerRepo: Repository<LedgerTransaction>,
    @InjectRepository(WalletAccount)
    private readonly walletRepo: Repository<WalletAccount>,
  ) {}

  /**
   * Executes a strongly transactional, immutable ledger entry with pessimistic balance locking.
   * Runs within an existing or dedicated database transaction.
   */
  async recordTransaction(
    params: PostTransactionParams,
    existingManager?: EntityManager,
  ): Promise<{ transaction: LedgerTransaction; newBalanceMinor: string }> {
    const execute = async (manager: EntityManager) => {
      // 1. Idempotency Check
      if (params.idempotencyKey) {
        const existingTx = await manager.findOne(LedgerTransaction, {
          where: { idempotencyKey: params.idempotencyKey },
        });
        if (existingTx) {
          this.logger.warn(`Idempotent retry detected for key: ${params.idempotencyKey}`);
          return {
            transaction: existingTx,
            newBalanceMinor: existingTx.balanceAfterMinor,
          };
        }
      }

      // 2. Lock the wallet account row pessimistically if supported by DB driver
      let walletQuery = manager
        .createQueryBuilder(WalletAccount, 'wallet')
        .where('wallet.id = :id', { id: params.walletId });

      if (manager.connection.options.type === 'postgres') {
        walletQuery = walletQuery.setLock('pessimistic_write');
      }

      const wallet = await walletQuery.getOne();

      if (!wallet) {
        throw new BadRequestException(`Wallet not found: ${params.walletId}`);
      }

      if (wallet.status !== 'ACTIVE') {
        throw new BadRequestException(`Wallet is not active (status: ${wallet.status})`);
      }

      // 3. Precise integer minor calculations
      const currentBalance = BigInt(wallet.balanceMinor);
      const deltaAmount = BigInt(params.amountMinor);
      const newBalance = currentBalance + deltaAmount;

      // Negative balance check for debits
      if (newBalance < 0n) {
        throw new BadRequestException(
          `Insufficient funds. Current balance: ${currentBalance.toString()}, attempted debit: ${(-deltaAmount).toString()}`,
        );
      }

      // 4. Update mutable cache balance on wallet
      wallet.balanceMinor = newBalance.toString();
      await manager.save(wallet);

      // 5. Create immutable ledger record
      const ledgerEntry = manager.create(LedgerTransaction, {
        walletId: wallet.id,
        transactionType: params.transactionType,
        amountMinor: deltaAmount.toString(),
        currency: params.currency,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        balanceAfterMinor: newBalance.toString(),
        status: 'COMPLETED',
        idempotencyKey: params.idempotencyKey,
      });

      const savedTx = await manager.save(ledgerEntry);
      return {
        transaction: savedTx,
        newBalanceMinor: newBalance.toString(),
      };
    };

    if (existingManager) {
      return execute(existingManager);
    } else {
      return this.ledgerRepo.manager.transaction(execute);
    }
  }

  async getTransactions(walletId: string, limit = 50): Promise<LedgerTransaction[]> {
    return this.ledgerRepo.find({
      where: { walletId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
