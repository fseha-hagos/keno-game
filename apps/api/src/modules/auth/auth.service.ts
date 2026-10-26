import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { RegisterInput, LoginInput } from '@keno/validation';
import { UserStatus, KycStatus, KycTier, UserRole, AuthTokens } from '@keno/shared-types';
import { GAME_CONFIG } from '@keno/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly walletService: WalletService,
    private readonly auditService: AuditService,
  ) {}
  async register(input: RegisterInput): Promise<{ user: User; tokens: AuthTokens }> {
    const cleanPhone = input.phone.trim();
    const existingPhone = await this.userRepo.findOne({
      where: { phone: cleanPhone },
    });
    if (existingPhone) {
      throw new ConflictException('This phone number is already registered. Please sign in instead.');
    }

    const existingUsername = await this.userRepo.findOne({
      where: { username: input.username.trim() },
    });
    if (existingUsername) {
      throw new ConflictException('This username is already taken. Please choose a different username.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = this.userRepo.create({
      phone: cleanPhone,
      username: input.username,
      passwordHash,
      email: input.email ? input.email.toLowerCase() : undefined,
      dateOfBirth: input.dateOfBirth,
      status: UserStatus.ACTIVE,
      kycStatus: KycStatus.NOT_STARTED,
      kycTier: KycTier.TIER_1,
      roles: [UserRole.PLAYER],
    });

    const savedUser = await this.userRepo.save(user);

    // Create an empty wallet; never grant demo funds during registration.
    await this.walletService.getOrCreateWallet(
      savedUser.id,
      GAME_CONFIG.DEFAULT_CURRENCY,
    );

    await this.auditService.log({
      actorId: savedUser.id,
      actorRole: 'PLAYER',
      action: 'USER_REGISTERED',
      entity: 'USER',
      entityId: savedUser.id,
      metadata: { phone: savedUser.phone, username: savedUser.username },
    });

    const tokens = await this.generateTokens(savedUser);
    return { user: savedUser, tokens };
  }

  async login(input: LoginInput): Promise<{ user: User; tokens: AuthTokens }> {
    const cleanPhone = input.phone.trim();
    const user = await this.userRepo.findOne({
      where: [{ phone: cleanPhone }, { username: cleanPhone }],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    if (user.status === UserStatus.FROZEN || user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException(
        'This account has been frozen or suspended by an administrator. Please contact support.',
      );
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    const tokens = await this.generateTokens(user);

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.roles[0] || 'PLAYER',
      action: 'USER_LOGIN',
      entity: 'USER',
      entityId: user.id,
      metadata: { deviceId: input.deviceId, phone: user.phone },
    });

    return { user, tokens };
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    if (typeof newPassword !== 'string' || newPassword.length < 12) {
      throw new ConflictException('New password must be at least 12 characters long');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    const oldPasswordMatches = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!oldPasswordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.currentRefreshTokenHash = null;
    await this.userRepo.save(user);

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.roles[0] || 'PLAYER',
      action: 'USER_PASSWORD_CHANGED',
      entity: 'USER',
      entityId: user.id,
      metadata: {},
    });

    return { message: 'Password changed successfully. Please sign in again.' };
  }

  async refreshToken(token: string): Promise<AuthTokens> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env['JWT_REFRESH_SECRET']!,
      });

      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      if (!user || !user.currentRefreshTokenHash) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const isMatch = await bcrypt.compare(token, user.currentRefreshTokenHash);
      if (!isMatch) {
        throw new UnauthorizedException('Refresh token rotation mismatch');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      phone: user.phone,
      username: user.username,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env['JWT_ACCESS_SECRET']!,
      expiresIn: GAME_CONFIG.JWT_ACCESS_EXPIRES_IN_SECONDS,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env['JWT_REFRESH_SECRET']!,
      expiresIn: GAME_CONFIG.JWT_REFRESH_EXPIRES_IN_SECONDS,
    });

    // Hash and store refresh token for rotation
    const refreshHash = await bcrypt.hash(refreshToken, 10);
    user.currentRefreshTokenHash = refreshHash;
    await this.userRepo.save(user);

    return {
      accessToken,
      refreshToken,
      expiresIn: GAME_CONFIG.JWT_ACCESS_EXPIRES_IN_SECONDS,
      tokenType: 'Bearer',
    };
  }
}
