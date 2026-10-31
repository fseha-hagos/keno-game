
import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';
import { UserStatus, KycStatus, KycTier, UserRole } from '@keno/shared-types';

@Injectable()
export class AdminSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    const existingAdmin = await this.userRepo
      .createQueryBuilder('user')
      .where("user.roles LIKE :role", { role: '%SUPER_ADMIN%' })
      .getOne();

    if (existingAdmin) {
      this.logger.log('A SUPER_ADMIN account already exists.');
      return;
    }

    const adminPhone = process.env['ADMIN_PHONE'];
    const adminUsername = process.env['ADMIN_USERNAME'];
    const adminPassword = process.env['ADMIN_PASSWORD'];

    if (!adminPhone || !adminUsername || !adminPassword) {
      throw new Error(
        'No SUPER_ADMIN exists. Set ADMIN_PHONE, ADMIN_USERNAME, and ADMIN_PASSWORD before starting the API.',
      );
    }

    if (adminPassword.length < 16) {
      throw new Error('ADMIN_PASSWORD must be at least 16 characters long.');
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);

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
    this.logger.log('SUPER_ADMIN account created successfully.');
  }
}
