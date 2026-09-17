import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KycTier } from '@keno/shared-types';

@ApiTags('KYC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current user KYC verification status' })
  async getStatus(@Request() req: any) {
    return this.kycService.getKycStatus(req.user.id);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Initiate or upgrade KYC verification' })
  async verify(@Request() req: any, @Body() body: { tier?: KycTier }) {
    return this.kycService.initiateVerification(req.user.id, body.tier || KycTier.TIER_1);
  }
}
