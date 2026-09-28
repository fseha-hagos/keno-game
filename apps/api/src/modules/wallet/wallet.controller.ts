import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GAME_CONFIG } from '@keno/config';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get current user wallet account balance' })
  @ApiQuery({ name: 'currency', required: false, example: 'ETB' })
  async getBalance(@Request() req: any, @Query('currency') currency?: string) {
    const targetCurrency = currency || GAME_CONFIG.DEFAULT_CURRENCY;
    const wallet = await this.walletService.getWalletByUserId(req.user.id, targetCurrency);
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
  @ApiQuery({ name: 'currency', required: false, example: 'ETB' })
  async getTransactions(@Request() req: any, @Query('currency') currency?: string) {
    const targetCurrency = currency || GAME_CONFIG.DEFAULT_CURRENCY;
    return this.walletService.getTransactions(req.user.id, targetCurrency);
  }

  /** Player: Submit deposit request (PENDING) */
  @Post('deposit')
  @ApiOperation({ summary: 'Submit a deposit request (requires admin approval before funds are credited)' })
  async deposit(@Request() req: any, @Body() body: any) {
    return this.walletService.createDepositRequest(req.user.id, {
      amountMinor: body.amountMinor,
      currency: body.currency || 'ETB',
      paymentMethod: body.paymentMethod || body.paymentMethodId || 'telebirr',
      accountNumber: body.accountNumber,
      accountName: body.accountName,
      transactionReference: body.transactionReference,
      proofImageUrl: body.proofImageUrl,
      idempotencyKey: body.idempotencyKey,
    });
  }

  /** Player: Submit withdrawal request (PENDING — funds locked until approved) */
  @Post('withdraw')
  @ApiOperation({ summary: 'Submit a withdrawal request (funds locked until admin approves)' })
  async withdraw(@Request() req: any, @Body() body: any) {
    return this.walletService.createWithdrawalRequest(req.user.id, {
      amountMinor: body.amountMinor,
      currency: body.currency || 'ETB',
      paymentMethod: body.paymentMethod || body.destinationAccount || 'telebirr',
      destinationAccount: body.destinationAccount,
      idempotencyKey: body.idempotencyKey,
    });
  }

  /** Player: List own payment requests */
  @Get('payment-requests')
  @ApiOperation({ summary: 'Get own deposit/withdrawal requests' })
  async getMyPaymentRequests(@Request() req: any) {
    return this.walletService.getUserPaymentRequests(req.user.id);
  }

  /** Player: Submit proof/transaction reference for a pending deposit */
  @Patch('deposit/:id/proof')
  @ApiOperation({ summary: 'Submit transaction reference/proof for a pending deposit request' })
  async submitDepositProof(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.walletService.submitDepositProof(req.user.id, id, {
      transactionReference: body.transactionReference,
      proofImageUrl: body.proofImageUrl,
    });
  }

  /** ADMIN: List ALL payment requests */
  @Get('admin/payment-requests')
  @ApiOperation({ summary: '[Admin Only] List all payment requests across all players' })
  async adminListRequests(@Request() req: any) {
    if (!req.user.roles?.some((r: string) => ['SUPER_ADMIN', 'FINANCE', 'GAME_OPERATOR'].includes(r))) throw new ForbiddenException('Admin only');
    return this.walletService.getAllPendingRequests();
  }

  /** ADMIN: Approve a deposit request */
  @Patch('admin/deposit/:id/approve')
  @ApiOperation({ summary: '[Admin Only] Approve a pending deposit request' })
  async adminApproveDeposit(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    if (!req.user.roles?.some((r: string) => ['SUPER_ADMIN', 'FINANCE', 'GAME_OPERATOR'].includes(r))) throw new ForbiddenException('Admin only');
    return this.walletService.approveDeposit(id, req.user.id, body.adminNote);
  }

  /** ADMIN: Reject a deposit request */
  @Patch('admin/deposit/:id/reject')
  @ApiOperation({ summary: '[Admin Only] Reject a pending deposit request' })
  async adminRejectDeposit(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    if (!req.user.roles?.some((r: string) => ['SUPER_ADMIN', 'FINANCE', 'GAME_OPERATOR'].includes(r))) throw new ForbiddenException('Admin only');
    return this.walletService.rejectDeposit(id, req.user.id, body.adminNote);
  }

  /** ADMIN: Approve a withdrawal request */
  @Patch('admin/withdrawal/:id/approve')
  @ApiOperation({ summary: '[Admin Only] Approve a pending withdrawal request' })
  async adminApproveWithdrawal(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    if (!req.user.roles?.some((r: string) => ['SUPER_ADMIN', 'FINANCE', 'GAME_OPERATOR'].includes(r))) throw new ForbiddenException('Admin only');
    return this.walletService.approveWithdrawal(id, req.user.id, body.adminNote);
  }

  /** ADMIN: Reject a withdrawal request */
  @Patch('admin/withdrawal/:id/reject')
  @ApiOperation({ summary: '[Admin Only] Reject a pending withdrawal request' })
  async adminRejectWithdrawal(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    if (!req.user.roles?.some((r: string) => ['SUPER_ADMIN', 'FINANCE', 'GAME_OPERATOR'].includes(r))) throw new ForbiddenException('Admin only');
    return this.walletService.rejectWithdrawal(id, req.user.id, body.adminNote);
  }
}
