import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { KycStatus, KycTier } from '@keno/shared-types';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class KycService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  async initiateVerification(userId: string, tier = KycTier.TIER_1) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    throw new ServiceUnavailableException(
      'KYC verification is unavailable until a trusted provider is configured.',
    );
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
