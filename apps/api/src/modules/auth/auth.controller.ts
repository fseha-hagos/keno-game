import { Controller, Post, Get, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterInput, LoginInput, RefreshTokenInput } from '@keno/validation';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  @ApiOperation({ summary: 'Register a new player account (instant, no verification required)' })
  async register(@Body() body: RegisterInput) {
    return this.authService.register(body);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with phone number/username and password. Players login directly; admins require Telegram OTP.' })
  async login(@Body() body: LoginInput) {
    return this.authService.login(body);
  }

  @Post('admin/verify-otp')
  @ApiOperation({ summary: 'Verify admin Telegram OTP to complete administrator login' })
  async verifyAdminOtp(@Body() body: { otpSessionId: string; otp: string }) {
    if (!body?.otpSessionId || !body?.otp) {
      throw new BadRequestException('otpSessionId and 6-digit otp are required');
    }
    return this.authService.verifyAdminOtp(body.otpSessionId, body.otp);
  }

  @Post('admin/resend-otp')
  @ApiOperation({ summary: 'Resend admin Telegram OTP' })
  async resendAdminOtp(@Body() body: { otpSessionId: string }) {
    if (!body?.otpSessionId) {
      throw new BadRequestException('otpSessionId is required');
    }
    return this.authService.resendAdminOtp(body.otpSessionId);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request automated password recovery OTP via Telegram bot' })
  async forgotPassword(@Body() body: { identifier: string }) {
    if (!body?.identifier) {
      throw new BadRequestException('Username or phone number is required');
    }
    return this.authService.forgotPassword(body.identifier);
  }

  @Post('verify-reset-otp')
  @ApiOperation({ summary: 'Verify the password reset OTP code' })
  async verifyResetOtp(@Body() body: { resetSessionId: string; otp: string }) {
    if (!body?.resetSessionId || !body?.otp) {
      throw new BadRequestException('resetSessionId and otp are required');
    }
    return this.authService.verifyPasswordResetOtp(body.resetSessionId, body.otp);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with verified OTP' })
  async resetPassword(@Body() body: { resetSessionId: string; otp: string; newPassword: string }) {
    if (!body?.resetSessionId || !body?.otp || !body?.newPassword) {
      throw new BadRequestException('resetSessionId, otp, and newPassword are required');
    }
    return this.authService.resetPasswordWithOtp(body.resetSessionId, body.otp, body.newPassword);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate and obtain new access & refresh tokens' })
  async refresh(@Body() body: RefreshTokenInput) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(@Request() req: any, @Body() body: any) {
    if (
      !body ||
      typeof body.oldPassword !== 'string' ||
      typeof body.newPassword !== 'string'
    ) {
      throw new BadRequestException('Current and new passwords are required.');
    }
    return this.authService.changePassword(req.user.id, body.oldPassword, body.newPassword);
  }

  @Post('telegram/webhook')
  @ApiOperation({ summary: 'Telegram Bot webhook — receives /start and /link commands from admins to link their Telegram chat_id' })
  async telegramWebhook(@Body() body: any) {
    await this.authService.handleTelegramWebhook(body);
    return { ok: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getProfile(@Request() req: any) {
    const user = req.user;
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      status: user.status,
      kycStatus: user.kycStatus,
      kycTier: user.kycTier,
      roles: user.roles,
      selfExcludedUntil: user.selfExcludedUntil,
      coolingOffUntil: user.coolingOffUntil,
      createdAt: user.createdAt,
    };
  }
}
