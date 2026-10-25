import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterInput, LoginInput, RefreshTokenInput } from '@keno/validation';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new player account' })
  async register(@Body() body: RegisterInput) {
    return this.authService.register(body);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with phone number and password' })
  async login(@Body() body: LoginInput) {
    return this.authService.login(body);
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
    return this.authService.changePassword(req.user.id, body.oldPassword, body.newPassword);
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
      createdAt: user.createdAt,
    };
  }
}
