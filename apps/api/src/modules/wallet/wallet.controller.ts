import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DepositInput, WithdrawalInput } from '@keno/validation';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get current user wallet account balance' })
  async getBalance(@Request() req: any) {
    const wallet = await this.walletService.getWalletByUserId(req.user.id);
    return {
      id: wallet.id,
      currency: wallet.currency,
      balanceMinor: wallet.balanceMinor,
      lockedMinor: wallet.lockedMinor,
      status: wallet.status,
    };
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get wallet transaction ledger history' })
  async getTransactions(@Request() req: any) {
    return this.walletService.getTransactions(req.user.id);
  }

  @Post('deposit')
  @ApiOperation({ summary: 'Create a deposit into wallet' })
  async deposit(@Request() req: any, @Body() body: DepositInput) {
    return this.walletService.deposit(
      req.user.id,
      body.amountMinor,
      body.currency,
      body.idempotencyKey,
    );
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Request a withdrawal from wallet' })
  async withdraw(@Request() req: any, @Body() body: WithdrawalInput) {
    return this.walletService.withdraw(
      req.user.id,
      body.amountMinor,
      body.currency,
      body.idempotencyKey,
    );
  }
}
