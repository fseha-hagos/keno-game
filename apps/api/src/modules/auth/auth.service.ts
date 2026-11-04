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

  private getPhoneFormats(input: string): string[] {
    const raw = (input || '').trim();
    if (!raw) return [];
    const digits = raw.replace(/\D/g, '');
    const set = new Set<string>();
    set.add(raw);
    if (digits) {
      set.add(digits);
      if (!digits.startsWith('0')) {
        set.add(`+${digits}`);
      }
    }

    if (/^251[79]\d{8}$/.test(digits)) {
      const local = '0' + digits.slice(3);
      set.add(local);
      set.add(digits.slice(3));
      set.add(`+${digits}`);
      set.add(digits);
    } else if (/^0[79]\d{8}$/.test(digits)) {
      set.add(digits);
      set.add(`251${digits.slice(1)}`);
      set.add(`+251${digits.slice(1)}`);
      set.add(digits.slice(1));
    } else if (/^[79]\d{8}$/.test(digits)) {
      set.add(`0${digits}`);
      set.add(`251${digits}`);
      set.add(`+251${digits}`);
      set.add(digits);
    }

    return Array.from(set);
  }

  /**
   * Called by the Telegram bot webhook or long-polling when a message arrives.
   * Handles secure admin linking via native Telegram contact sharing (phone number)
   * or authenticated /link <username> <password> command, preventing unauthorized
   * devices from hijacking admin accounts or receiving 2FA OTP codes.
   */
  async handleTelegramWebhook(body: any): Promise<void> {
    const token = process.env['TELEGRAM_BOT_TOKEN'];
    if (!token) return;

    const message = body?.message;
    if (!message || (!message.text && !message.contact)) return;

    const chatId = String(message.chat?.id ?? '');
    if (!chatId) return;

    const fromUsername = message.from?.username
      ? `@${message.from.username}`
      : message.from?.first_name || 'Admin';

    const sendReply = async (replyText: string, replyMarkup?: any) => {
      try {
        const payload: any = {
          chat_id: chatId,
          text: replyText,
          parse_mode: 'HTML',
        };
        if (replyMarkup) {
          payload.reply_markup = replyMarkup;
        }
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.text();
          this.logger.warn(`Telegram API error (${res.status}): ${errData}`);
        }
      } catch (e: any) {
        this.logger.warn(`Failed to send Telegram webhook reply: ${e.message}`);
      }
    };

    const linkKeyboard = {
      keyboard: [
        [
          {
            text: '📱 Verify & Link Admin Phone',
            request_contact: true,
          },
        ],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    };

    // ──────────────── 1. NATIVE TELEGRAM CONTACT VERIFICATION ────────────────
    if (message.contact) {
      const contact = message.contact;
      const senderId = message.from?.id;

      // Anti-spoofing check: ensure contact belongs to sender, not a forwarded vCard
      if (contact.user_id && senderId && Number(contact.user_id) !== Number(senderId)) {
        await sendReply(
          `❌ <b>Security Verification Failed</b>\n\n` +
          `Please tap the <b>"📱 Verify & Link Admin Phone"</b> button directly. Forwarded contact cards cannot be accepted for security reasons.`,
          linkKeyboard,
        );
        return;
      }

      const rawPhone = String(contact.phone_number || '').trim();
      const phoneFormats = this.getPhoneFormats(rawPhone);

      const user = await this.userRepo.findOne({
        where: phoneFormats.map((p) => ({ phone: p })),
      });

      if (!user) {
        await sendReply(
          `❌ <b>Admin Phone Not Registered</b>\n\n` +
          `Your Telegram phone number (<b>${rawPhone}</b>) does not match any administrator account in Fast Keno.\n\n` +
          `Please ensure your admin account was created with this exact phone number.\n\n` +
          `If you have credentials, you can link with your password:\n` +
          `<code>/link &lt;username&gt; &lt;password&gt;</code>`,
          linkKeyboard,
        );
        return;
      }

      const isAdmin = user.roles?.some((r) => ADMIN_ROLES.includes(r as UserRole));
      if (!isAdmin) {
        await sendReply(
          `❌ Account <b>${user.username}</b> (${user.phone}) does not have administrator privileges. Only admin accounts can be linked for 2FA OTP codes.`,
          { remove_keyboard: true },
        );
        return;
      }

      const previousChat = user.telegramChatId;
      user.telegramChatId = chatId;
      await this.userRepo.save(user);

      this.logger.log(`Admin "${user.username}" (${user.phone}) securely linked via Telegram Contact sharing (chat_id: ${chatId})`);

      await this.auditService.log({
        actorId: user.id,
        actorRole: user.roles[0] || 'ADMIN',
        action: 'ADMIN_TELEGRAM_LINKED_VIA_PHONE',
        entity: 'USER',
        entityId: user.id,
        metadata: { chatId, fromUsername, phone: user.phone, previousChat },
      });

      await sendReply(
        `✅ <b>Phone Verified & Telegram Linked!</b>\n\n` +
        `👤 Admin: <b>${user.username}</b>\n` +
        `📱 Phone: <b>${user.phone}</b>\n` +
        `🛡️ Role: <b>${user.roles.join(', ')}</b>\n\n` +
        `Your Telegram account is now securely registered.\n` +
        `2FA login OTP codes will be delivered here automatically when you sign in to the Fast Keno Admin Console.`,
        { remove_keyboard: true },
      );
      return;
    }

    const text: string = (message.text || '').trim();

    // ──────────────── 2. DEEP-LINK RESET: /start reset_<sessionId> ────────────────
    const resetMatch = text.match(/^\/start\s+reset_([a-zA-Z0-9-]+)$/i);
    if (resetMatch && resetMatch[1]) {
      const sessionId = resetMatch[1];
      const session = this.passwordResetSessions.get(sessionId);

      if (!session) {
        await sendReply(`❌ Password reset session has expired or is invalid. Please request a new code from the website.`);
        return;
      }

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

    // ──────────────── 3. /start OR /help ────────────────
    if (text === '/start' || text === '/help') {
      await sendReply(
        `👋 <b>Welcome to Fast Keno Admin & Security Bot</b>\n\n` +
        `This bot delivers 2FA OTP security codes for Fast Keno administrators.\n\n` +
        `🔐 <b>How to link your Admin account:</b>\n` +
        `1️⃣ <b>1-Tap Phone Link (Easiest):</b> Tap the <b>"📱 Verify & Link Admin Phone"</b> button below.\n` +
        `2️⃣ <b>Command Link:</b> <code>/link &lt;username_or_phone&gt; &lt;password&gt;</code>\n\n` +
        `📋 <b>Available Commands:</b>\n` +
        `• <code>/status</code> — View linked accounts\n` +
        `• <code>/unlink &lt;username&gt; &lt;password&gt;</code> — Unlink account\n\n` +
        `Need support? Contact @Fastkenosupportteam`,
        linkKeyboard,
      );
      return;
    }

    // ──────────────── 4. /status ────────────────
    if (text === '/status' || text === '/myinfo') {
      const linkedAdmins = await this.userRepo.find({
        where: { telegramChatId: chatId },
      });
      if (!linkedAdmins || linkedAdmins.length === 0) {
        await sendReply(
          `ℹ️ This Telegram account is <b>not linked</b> to any Fast Keno admin account.\n\n` +
          `Tap the button below to link your registered phone number.`,
          linkKeyboard,
        );
      } else {
        const list = linkedAdmins.map((u) => `• <b>${u.username}</b> (${u.phone}) — <i>${u.roles.join(', ')}</i>`).join('\n');
        await sendReply(
          `✅ <b>Linked Fast Keno Admin Account(s):</b>\n\n${list}\n\n` +
          `2FA OTP codes for these accounts will be delivered to this chat.`,
        );
      }
      return;
    }

    // ──────────────── 5. /link <username_or_phone> <password> ────────────────
    const linkWithPassMatch = text.match(/^\/link\s+(\S+)\s+(.+)$/i);
    if (linkWithPassMatch && linkWithPassMatch[1] && linkWithPassMatch[2]) {
      const identifier = linkWithPassMatch[1].trim();
      const password = linkWithPassMatch[2].trim();
      const candidatePhones = this.getPhoneFormats(identifier);

      const user = await this.userRepo.findOne({
        where: [
          { username: identifier },
          { phone: identifier },
          ...candidatePhones.map((p) => ({ phone: p })),
        ],
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

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        await sendReply(`❌ Incorrect password for admin <b>${user.username}</b>. Linking rejected.`);
        return;
      }

      if (user.telegramChatId && user.telegramChatId !== chatId) {
        await sendReply(
          `⚠️ <b>Security Notice</b>\n\n` +
          `Admin account <b>${user.username}</b> was previously linked to another Telegram device.\n\n` +
          `Ownership has been verified via password and updated to this device.`,
        );
      }

      const previousChat = user.telegramChatId;
      user.telegramChatId = chatId;
      await this.userRepo.save(user);

      this.logger.log(`Admin "${user.username}" (${user.phone}) securely linked via password to chat_id: ${chatId}`);

      await this.auditService.log({
        actorId: user.id,
        actorRole: user.roles[0] || 'ADMIN',
        action: 'ADMIN_TELEGRAM_LINKED_VIA_PASSWORD',
        entity: 'USER',
        entityId: user.id,
        metadata: { chatId, fromUsername, phone: user.phone, previousChat },
      });

      await sendReply(
        `✅ <b>Telegram Linked Successfully!</b>\n\n` +
        `👤 Admin: <b>${user.username}</b>\n` +
        `📱 Phone: <b>${user.phone}</b>\n` +
        `🛡️ Role: <b>${user.roles.join(', ')}</b>\n\n` +
        `2FA login OTP codes will now be sent here whenever you log in to the Fast Keno Admin Console.`,
        { remove_keyboard: true },
      );
      return;
    }

    // ──────────────── 6. BLOCKED UNPROTECTED /link <identifier> ────────────────
    const linkOnlyMatch = text.match(/^\/link(\s+(\S+))?$/i);
    if (linkOnlyMatch) {
      const identifier = linkOnlyMatch[2]?.trim();
      const targetText = identifier ? `for account <b>${identifier}</b>` : '';

      await sendReply(
        `🔒 <b>Authentication Required</b>\n\n` +
        `To protect admin accounts from unauthorized access, linking ${targetText} requires verification.\n\n` +
        `👉 <b>Option 1 (Instant):</b> Tap the <b>"📱 Verify & Link Admin Phone"</b> button below.\n\n` +
        `👉 <b>Option 2:</b> Provide your admin password:\n` +
        `<code>/link ${identifier || '&lt;username&gt;'} &lt;password&gt;</code>`,
        linkKeyboard,
      );
      return;
    }

    // ──────────────── 7. /unlink <username_or_phone> <password> ────────────────
    const unlinkWithPassMatch = text.match(/^\/unlink\s+(\S+)\s+(.+)$/i);
    if (unlinkWithPassMatch && unlinkWithPassMatch[1] && unlinkWithPassMatch[2]) {
      const identifier = unlinkWithPassMatch[1].trim();
      const password = unlinkWithPassMatch[2].trim();
      const candidatePhones = this.getPhoneFormats(identifier);

      const user = await this.userRepo.findOne({
        where: [
          { username: identifier },
          { phone: identifier },
          ...candidatePhones.map((p) => ({ phone: p })),
        ],
      });

      if (!user) {
        await sendReply(`❌ Account <b>${identifier}</b> not found.`);
        return;
      }

      const isAdmin = user.roles?.some((r) => ADMIN_ROLES.includes(r as UserRole));
      if (!isAdmin) {
        await sendReply(`❌ Account <b>${user.username}</b> is not an administrator.`);
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        await sendReply(`❌ Incorrect password for admin <b>${user.username}</b>. Unlinking rejected.`);
        return;
      }

      user.telegramChatId = null;
      await this.userRepo.save(user);

      await this.auditService.log({
        actorId: user.id,
        actorRole: user.roles[0] || 'ADMIN',
        action: 'ADMIN_TELEGRAM_UNLINKED',
        entity: 'USER',
        entityId: user.id,
        metadata: { chatId, fromUsername },
      });

      await sendReply(
        `✅ <b>Telegram Unlinked Successfully</b>\n\n` +
        `Admin account <b>${user.username}</b> is no longer linked to this Telegram account.`,
        { remove_keyboard: true },
      );
      return;
    }

    const unlinkOnlyMatch = text.match(/^\/unlink(\s+(\S+))?$/i);
    if (unlinkOnlyMatch) {
      const identifier = unlinkOnlyMatch[2]?.trim();
      await sendReply(
        `🔒 <b>Password Required to Unlink</b>\n\n` +
        `To unlink an admin account, please provide your password:\n` +
        `<code>/unlink ${identifier || '&lt;username&gt;'} &lt;password&gt;</code>`,
      );
      return;
    }

    // ──────────────── 8. UNKNOWN COMMAND ────────────────
    await sendReply(
      `👋 <b>Welcome to Fast Keno Admin Bot</b>\n\n` +
      `Tap the button below to link your admin phone, or use:\n` +
      `<code>/link &lt;username&gt; &lt;password&gt;</code>\n\n` +
      `For help, contact @Fastkenosupportteam`,
      linkKeyboard,
    );
  }
}
