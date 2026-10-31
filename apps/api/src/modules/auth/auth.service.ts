import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { User } from '../../database/entities/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { RegisterInput, LoginInput } from '@keno/validation';
import { UserStatus, KycStatus, KycTier, UserRole, AuthTokens } from '@keno/shared-types';
import { GAME_CONFIG } from '@keno/config';

interface PendingAdminOtpSession {
  userId: string;
  username: string;
  otp: string;
  expiresAt: number;
  attempts: number;
  telegramChatId: string | null;
}

interface PendingPasswordResetSession {
  userId: string;
  phone: string;
  username: string;
  otp: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

export interface AdminOtpResponse {
  requireOtp: true;
  otpSessionId: string;
  message: string;
}

export type LoginResult = { user: User; tokens: AuthTokens } | AdminOtpResponse;

const ADMIN_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.CREATOR,
  UserRole.BUSINESS_OWNER,
  UserRole.OPERATOR,
  UserRole.GAME_OPERATOR,
  UserRole.FINANCE,
  UserRole.KYC_OPERATOR,
  UserRole.RISK_OPERATOR,
  UserRole.SUPPORT,
];

@Injectable()
export class AuthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthService.name);
  private readonly adminOtpSessions = new Map<string, PendingAdminOtpSession>();
  private readonly passwordResetSessions = new Map<string, PendingPasswordResetSession>();
  private pollingTimer: NodeJS.Timeout | null = null;
  private lastUpdateId = 0;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly walletService: WalletService,
    private readonly auditService: AuditService,
  ) { }

  onModuleInit() {
    this.startTelegramPolling();
  }

  onModuleDestroy() {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Long-polls the Telegram bot getUpdates so linking works out-of-the-box
   * on local dev or production without needing a public domain / HTTPS webhook.
   */
  private startTelegramPolling() {
    const token = process.env['TELEGRAM_BOT_TOKEN'];
    if (!token) return;

    const poll = async () => {
      try {
        const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=10`;
        const res = await fetch(url);
        if (res.ok) {
          const data: any = await res.json();
          if (data.ok && Array.isArray(data.result)) {
            for (const update of data.result) {
              if (update.update_id > this.lastUpdateId) {
                this.lastUpdateId = update.update_id;
              }
              await this.handleTelegramWebhook(update);
            }
          }
        }
      } catch (err: any) {
        // Silently retry on network hiccups
      } finally {
        this.pollingTimer = setTimeout(poll, 2000);
      }
    };

    poll();
    this.logger.log('Telegram Bot polling initialized for admin linking and OTP delivery');
  }

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

  async login(input: LoginInput): Promise<LoginResult> {
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

    // Check if account has any administrator / staff role
    const isAdmin = user.roles?.some((r) => ADMIN_ROLES.includes(r as UserRole));

    if (isAdmin) {
      // Generate a secure 6-digit numeric OTP for admin two-step verification
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpSessionId = randomUUID();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

      this.adminOtpSessions.set(otpSessionId, {
        userId: user.id,
        username: user.username,
        otp,
        expiresAt,
        attempts: 0,
        telegramChatId: user.telegramChatId ?? null,
      });

      // Dispatch OTP via Telegram Bot to the admin's linked Telegram chat
      await this.sendTelegramAdminOtp(user.username, otp, user.telegramChatId ?? null);

      await this.auditService.log({
        actorId: user.id,
        actorRole: user.roles[0] || 'ADMIN',
        action: 'ADMIN_OTP_DISPATCHED',
        entity: 'USER',
        entityId: user.id,
        metadata: { otpSessionId, phone: user.phone },
      });

      return {
        requireOtp: true,
        otpSessionId,
        message: `Security OTP sent to Telegram for admin ${user.username}. Please enter the 6-digit code.`,
      };
    }

    // Regular players proceed directly without OTP verification
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

  async verifyAdminOtp(
    otpSessionId: string,
    otp: string,
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const session = this.adminOtpSessions.get(otpSessionId);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired OTP session. Please sign in again.');
    }

    if (Date.now() > session.expiresAt) {
      this.adminOtpSessions.delete(otpSessionId);
      throw new UnauthorizedException('Security OTP has expired. Please sign in again.');
    }

    session.attempts += 1;
    if (session.attempts > 5) {
      this.adminOtpSessions.delete(otpSessionId);
      throw new UnauthorizedException('Too many incorrect attempts. Please sign in again.');
    }

    if (session.otp !== otp.trim()) {
      throw new UnauthorizedException('Incorrect OTP code. Please check your Telegram.');
    }

    // OTP verified successfully
    this.adminOtpSessions.delete(otpSessionId);

    const user = await this.userRepo.findOne({ where: { id: session.userId } });
    if (!user) {
      throw new UnauthorizedException('Admin account not found');
    }

    const tokens = await this.generateTokens(user);

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.roles[0] || 'ADMIN',
      action: 'ADMIN_OTP_VERIFIED',
      entity: 'USER',
      entityId: user.id,
      metadata: { phone: user.phone, username: user.username },
    });

    return { user, tokens };
  }

  async resendAdminOtp(otpSessionId: string): Promise<{ message: string }> {
    const session = this.adminOtpSessions.get(otpSessionId);
    if (!session) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    session.otp = newOtp;
    session.expiresAt = Date.now() + 5 * 60 * 1000;
    session.attempts = 0;

    await this.sendTelegramAdminOtp(session.username, newOtp, session.telegramChatId ?? null);

    return { message: 'A new security OTP has been dispatched to your Telegram.' };
  }

  async forgotPassword(identifier: string): Promise<{
    success: boolean;
    resetSessionId: string;
    phone: string;
    username: string;
    hasTelegramLinked: boolean;
    botLinkUrl?: string;
    message: string;
  }> {
    const cleanId = (identifier || '').trim();
    if (!cleanId) {
      throw new BadRequestException('Phone number or username is required');
    }

    // Verify if the phone number or username is registered
    const user = await this.userRepo.findOne({
      where: [{ phone: cleanId }, { username: cleanId }],
    });

    if (!user) {
      throw new BadRequestException('This phone number or username is not registered in our system.');
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetSessionId = randomUUID();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    this.passwordResetSessions.set(resetSessionId, {
      userId: user.id,
      phone: user.phone || cleanId,
      username: user.username,
      otp,
      expiresAt,
      attempts: 0,
      verified: false,
    });

    // Always log OTP to server console for monitoring/audit
    this.logger.log(
      `\n========================================\n[PASSWORD RESET OTP] User: ${user.username} (${user.phone}) | Code: ${otp}\n========================================\n`,
    );

    let hasTelegramLinked = false;
    let botLinkUrl: string | undefined;

    // If user has a linked Telegram chat_id, dispatch directly!
    if (user.telegramChatId) {
      hasTelegramLinked = true;
      await this.sendTelegramUserOtp(user.telegramChatId, user.username, otp);
    } else {
      // Bot link with deep-link start parameter so the user can tap 1 button to receive code
      botLinkUrl = `https://t.me/FastKeno3_bot?start=reset_${resetSessionId}`;
    }

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.roles?.[0] || 'PLAYER',
      action: 'PASSWORD_RESET_OTP_GENERATED',
      entity: 'USER',
      entityId: user.id,
      metadata: { phone: user.phone, resetSessionId },
    });

    return {
      success: true,
      resetSessionId,
      phone: user.phone || cleanId,
      username: user.username,
      hasTelegramLinked,
      botLinkUrl,
      message: hasTelegramLinked
        ? 'Automatic OTP sent to your Telegram account!'
        : 'Please open our Telegram bot to receive your instant verification code.',
    };
  }

  async verifyPasswordResetOtp(
    resetSessionId: string,
    otp: string,
  ): Promise<{ success: boolean; message: string }> {
    const session = this.passwordResetSessions.get(resetSessionId);
    if (!session) {
      throw new BadRequestException('Reset session has expired or is invalid. Please request a new code.');
    }

    if (Date.now() > session.expiresAt) {
      this.passwordResetSessions.delete(resetSessionId);
      throw new BadRequestException('Verification code has expired. Please request a new code.');
    }

    session.attempts += 1;
    if (session.attempts > 5) {
      this.passwordResetSessions.delete(resetSessionId);
      throw new BadRequestException('Too many incorrect attempts. Please request a new code.');
    }

    if (session.otp !== otp.trim()) {
      throw new BadRequestException('Incorrect OTP verification code. Please check and try again.');
    }

    session.verified = true;
    return {
      success: true,
      message: 'OTP verified successfully. You may now enter your new password.',
    };
  }

  async resetPasswordWithOtp(
    resetSessionId: string,
    otp: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    const session = this.passwordResetSessions.get(resetSessionId);
    if (!session) {
      throw new BadRequestException('Reset session has expired. Please request a new code.');
    }

    if (Date.now() > session.expiresAt) {
      this.passwordResetSessions.delete(resetSessionId);
      throw new BadRequestException('Reset session has expired. Please request a new code.');
    }

    if (!session.verified && session.otp !== otp.trim()) {
      throw new BadRequestException('Incorrect or unverified OTP code.');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters long.');
    }

    const user = await this.userRepo.findOne({ where: { id: session.userId } });
    if (!user) {
      throw new BadRequestException('User account not found.');
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.currentRefreshTokenHash = null; // Invalidate old sessions
    await this.userRepo.save(user);

    // Delete used session
    this.passwordResetSessions.delete(resetSessionId);

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.roles?.[0] || 'PLAYER',
      action: 'USER_PASSWORD_RESET_SUCCESS',
      entity: 'USER',
      entityId: user.id,
      metadata: { phone: user.phone },
    });

    return {
      success: true,
      message: 'Your password has been reset successfully! You can now log in with your new password.',
    };
  }

  private async sendTelegramUserOtp(chatId: string, username: string, otp: string) {
    const token = process.env['TELEGRAM_BOT_TOKEN'];
    if (!token) return;

    const text =
      `🔑 <b>Fast Keno Password Reset</b>\n\n` +
      `Hello <b>${username}</b>,\n` +
      `Your verification OTP code is: <code>${otp}</code>\n\n` +
      `⏰ This code is valid for <b>10 minutes</b>.\n` +
      `⚠️ Never share this code with anyone.`;

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      });
      this.logger.log(`Password reset OTP delivered via Telegram to ${username} (chat_id: ${chatId})`);
    } catch (err: any) {
      this.logger.warn(`Failed to dispatch user Telegram OTP: ${err.message}`);
    }
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

  private async sendTelegramAdminOtp(username: string, otp: string, chatId: string | null) {
    const token = process.env['TELEGRAM_BOT_TOKEN'];

    // Always log to console for audit trail
    this.logger.log(
      `\n========================================\n[ADMIN 2FA OTP] Admin: ${username} | Code: ${otp}\n========================================\n`,
    );

    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN is not set. OTP sent to console only.');
      return;
    }

    // Determine target chat_id: prefer admin's personal linked chat, fall back to env override
    const targetChatId = chatId || process.env['TELEGRAM_ADMIN_CHAT_ID'] || null;

    if (!targetChatId) {
      this.logger.warn(
        `Admin "${username}" has no linked Telegram account (telegramChatId is null). ` +
        `Ask them to send /start to the bot and then use /link <username> to link their account.`,
      );
      return;
    }

    const text =
      `🔐 <b>Fast Keno Admin Security Verification</b>\n\n` +
      `👤 Admin: <b>${username}</b>\n` +
      `🔑 Your one-time login OTP is: <code>${otp}</code>\n\n` +
      `⏰ Valid for <b>5 minutes</b>.\n` +
      `⚠️ Do <b>NOT</b> share this code with anyone.`;

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: targetChatId, text, parse_mode: 'HTML' }),
      });
      if (!res.ok) {
        const errData = await res.text();
        this.logger.warn(`Telegram API error ${res.status}: ${errData}`);
      } else {
        this.logger.log(`OTP dispatched via Telegram to chat_id: ${targetChatId}`);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to send Telegram message: ${err.message}`);
    }
  }

  /**
   * Called by the Telegram bot webhook when a message arrives.
   * Handles /start and /link <username> commands so admins can link
   * their Telegram chat_id to their Fast Keno admin account.
   */
  async handleTelegramWebhook(body: any): Promise<void> {
    const token = process.env['TELEGRAM_BOT_TOKEN'];
    if (!token) return;

    const message = body?.message;
    if (!message || !message.text) return;

    const chatId = String(message.chat?.id ?? '');
    const fromUsername = message.from?.username ?? 'Unknown';
    const text: string = message.text.trim();

    const sendReply = async (replyText: string) => {
      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: replyText, parse_mode: 'HTML' }),
        });
      } catch (e: any) {
        this.logger.warn(`Failed to send webhook reply: ${e.message}`);
      }
    };

    // Handle deep-link start: /start reset_<sessionId>
    const resetMatch = text.match(/^\/start\s+reset_([a-zA-Z0-9-]+)$/i);
    if (resetMatch && resetMatch[1]) {
      const sessionId = resetMatch[1];
      const session = this.passwordResetSessions.get(sessionId);

      if (!session) {
        await sendReply(`❌ Password reset session has expired or is invalid. Please request a new code from the website.`);
        return;
      }

      // Automatically link user's telegramChatId so future OTPs are sent without /start
      const user = await this.userRepo.findOne({ where: { id: session.userId } });
      if (user && !user.telegramChatId) {
        user.telegramChatId = chatId;
        await this.userRepo.save(user);
      }

      await sendReply(
        `🔑 <b>Fast Keno Password Reset Code</b>\n\n` +
        `Hello <b>${session.username}</b>,\n` +
        `Your verification OTP code is: <code>${session.otp}</code>\n\n` +
        `⏰ Valid for 10 minutes.\n` +
        `Enter this code in the password reset window on Fast Keno to create your new password!`,
      );
      return;
    }

    if (text === '/start') {
      await sendReply(
        `👋 Welcome to Fast Keno if you want help @Fastkenosupportteam`,
      );
      return;
    }

    const linkMatch = text.match(/^\/link\s+(\S+)$/i);
    if (linkMatch && linkMatch[1]) {
      const identifier = linkMatch[1].trim();
      const user = await this.userRepo.findOne({
        where: [{ username: identifier }, { phone: identifier }],
      });

      if (!user) {
        await sendReply(`❌ Admin account with username/phone <b>${identifier}</b> not found.`);
        return;
      }

      const isAdmin = user.roles?.some((r) => ADMIN_ROLES.includes(r as UserRole));
      if (!isAdmin) {
        await sendReply(`❌ Account <b>${user.username}</b> does not have administrator privileges.`);
        return;
      }

      user.telegramChatId = chatId;
      await this.userRepo.save(user);

      this.logger.log(`Admin "${user.username}" (${user.phone}) linked Telegram chat_id: ${chatId} (Telegram: @${fromUsername})`);

      await sendReply(
        `✅ <b>Telegram linked successfully!</b>\n\n` +
        `Admin: <b>${user.username}</b>\n` +
        `Phone: <b>${user.phone}</b>\n` +
        `Role: <b>${user.roles.join(', ')}</b>\n` +
        `Telegram: @${fromUsername}\n\n` +
        `From now on, your 2FA OTP codes will be sent here when you log in to the Fast Keno Admin Console.`,
      );
      return;
    }

    // Unknown command
    await sendReply(
      `👋 Welcome to Fast Keno if you want help @Fastkenosupportteam`,
    );
  }
}
