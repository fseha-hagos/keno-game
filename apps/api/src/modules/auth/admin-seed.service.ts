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
    // Check if any SUPER_ADMIN user already exists
    const existingAdmin = await this.userRepo
      .createQueryBuilder('user')
      .where("user.roles LIKE :role", { role: '%SUPER_ADMIN%' })
      .getOne();

    if (existingAdmin) {
      this.logger.log(`Admin user already exists: ${existingAdmin.username}`);
      return;
    }

    // Create default admin user
    const adminPhone = process.env['ADMIN_PHONE'] || '0900000000';
    const adminUsername = process.env['ADMIN_USERNAME'] || 'admin';
    const adminPassword = process.env['ADMIN_PASSWORD'] || 'admin123';

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    const admin = this.userRepo.create({
      phone: adminPhone,
      username: adminUsername,
      passwordHash,
      status: UserStatus.ACTIVE,
      kycStatus: KycStatus.APPROVED,
      kycTier: KycTier.TIER_3,
      roles: [UserRole.SUPER_ADMIN],
    });

    await this.userRepo.save(admin);
    this.logger.log(`✅ Default SUPER_ADMIN user created — Username: "${adminUsername}", Password: "${adminPassword}"`);
    this.logger.warn(`⚠️  Change the default admin password in production!`);
  }
}
