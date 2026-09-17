import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { KycStatus, KycTier } from '@keno/shared-types';
import { KycProvider, KycVerificationRequest, KycVerificationResult } from './kyc.provider.interface';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class MockKycProvider implements KycProvider {
  readonly providerName = 'MockKycProvider';

  async createVerification(req: KycVerificationRequest): Promise<KycVerificationResult> {
    return {
      verificationId: `ver_${Date.now()}_${req.userId}`,
      status: KycStatus.APPROVED,
      tier: req.tier,
      providerReference: `ref_${Date.now()}`,
      details: 'Mock instant approval for development & testing',
    };
  }

  async getVerificationStatus(verificationId: string): Promise<KycVerificationResult> {
    return {
      verificationId,
      status: KycStatus.APPROVED,
      tier: KycTier.TIER_1,
      providerReference: `ref_${verificationId}`,
    };
  }

  async handleWebhook(payload: any, signature: string): Promise<KycVerificationResult> {
    return {
      verificationId: payload.verificationId,
      status: payload.status,
      tier: payload.tier || KycTier.TIER_1,
      providerReference: payload.providerReference,
    };
  }
}

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
  private readonly provider: KycProvider;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditService: AuditService,
  ) {
    this.provider = new MockKycProvider();
  }

  async initiateVerification(userId: string, tier = KycTier.TIER_1) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const result = await this.provider.createVerification({ userId, tier });

    user.kycStatus = result.status;
    user.kycTier = result.tier;
    await this.userRepo.save(user);

    await this.auditService.log({
      actorId: userId,
      actorRole: 'PLAYER',
      action: 'KYC_STATUS_CHANGED',
      entity: 'USER',
      entityId: userId,
      metadata: { kycStatus: user.kycStatus, tier: user.kycTier, provider: this.provider.providerName },
    });

    return result;
  }

  async getKycStatus(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    return {
      status: user.kycStatus,
      tier: user.kycTier,
    };
  }
}
