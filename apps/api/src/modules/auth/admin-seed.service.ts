import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';
import { UserStatus, KycStatus, KycTier, UserRole } from '@keno/shared-types';

/**
 * Seeds a default SUPER_ADMIN user on application startup if none exists.
 * This ensures the admin panel always has an account to log in with.
 */
@Injectable()
export class AdminSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    const salt = await bcrypt.genSalt(10);

    // 1. CREATOR (Highest admin)
    const adminPhone = process.env['ADMIN_PHONE'] || '0900000000';
    const adminUsername = process.env['ADMIN_USERNAME'] || 'admin';
    const adminPassword = process.env['ADMIN_PASSWORD'] || 'admin123';

    let creator = await this.userRepo.findOne({
      where: [{ phone: adminPhone }, { username: adminUsername }],
    });

    if (!creator) {
      const passwordHash = await bcrypt.hash(adminPassword, salt);
      creator = this.userRepo.create({
        phone: adminPhone,
        username: adminUsername,
        passwordHash,
        status: UserStatus.ACTIVE,
        kycStatus: KycStatus.APPROVED,
        kycTier: KycTier.TIER_3,
        roles: [UserRole.CREATOR, UserRole.SUPER_ADMIN],
      });
      await this.userRepo.save(creator);
      this.logger.log(`✅ Default CREATOR user created — Username: "${adminUsername}", Phone: "${adminPhone}"`);
    } else {
      // Ensure CREATOR role is in roles
      const rolesSet = new Set(creator.roles || []);
      if (!rolesSet.has(UserRole.CREATOR)) {
        rolesSet.add(UserRole.CREATOR);
        rolesSet.add(UserRole.SUPER_ADMIN);
        creator.roles = Array.from(rolesSet);
        await this.userRepo.save(creator);
        this.logger.log(`Updated admin user ${creator.username} to include CREATOR role`);
      }
    }

    // 2. BUSINESS OWNER
    const ownerPhone = '0911000001';
    const ownerUsername = 'owner';
    const ownerPassword = 'owner123';
    let owner = await this.userRepo.findOne({
      where: [{ phone: ownerPhone }, { username: ownerUsername }],
    });
    if (!owner) {
      const passwordHash = await bcrypt.hash(ownerPassword, salt);
      owner = this.userRepo.create({
        phone: ownerPhone,
        username: ownerUsername,
        passwordHash,
        status: UserStatus.ACTIVE,
        kycStatus: KycStatus.APPROVED,
        kycTier: KycTier.TIER_3,
        roles: [UserRole.BUSINESS_OWNER],
      });
      await this.userRepo.save(owner);
      this.logger.log(`✅ Default BUSINESS_OWNER created — Username: "${ownerUsername}", Phone: "${ownerPhone}", Pass: "${ownerPassword}"`);
    }

    // 3. OPERATOR
    const operatorPhone = '0922000002';
    const operatorUsername = 'operator';
    const operatorPassword = 'operator123';
    let operator = await this.userRepo.findOne({
      where: [{ phone: operatorPhone }, { username: operatorUsername }],
    });
    if (!operator) {
      const passwordHash = await bcrypt.hash(operatorPassword, salt);
      operator = this.userRepo.create({
        phone: operatorPhone,
        username: operatorUsername,
        passwordHash,
        status: UserStatus.ACTIVE,
        kycStatus: KycStatus.APPROVED,
        kycTier: KycTier.TIER_2,
        roles: [UserRole.OPERATOR, UserRole.GAME_OPERATOR],
      });
      await this.userRepo.save(operator);
      this.logger.log(`✅ Default OPERATOR created — Username: "${operatorUsername}", Phone: "${operatorPhone}", Pass: "${operatorPassword}"`);
    }
  }
}
