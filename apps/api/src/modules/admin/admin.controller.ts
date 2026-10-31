import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole, UserStatus } from '@keno/shared-types';

@ApiTags('Admin Console & Segmentation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /* ────────────────── SYSTEM CONTROL (CREATOR ONLY) ────────────────── */

  @Get('system/status')
  @ApiOperation({ summary: 'Get overall platform active/maintenance status' })
  getSystemStatus() {
    return this.adminService.getSystemStatus();
  }

  @Post('system/toggle')
  @ApiOperation({ summary: '[Creator Only] Activate / Deactivate the whole system' })
  async toggleSystemStatus(
    @Request() req: any,
    @Body() body: { active: boolean; message?: string },
  ) {
    return this.adminService.toggleSystemStatus(req.user, body.active, body.message);
  }

  /* ────────────────── RTP CONFIGURATION (CREATOR ONLY) ────────────────── */

  @Get('system/rtp')
  @ApiOperation({ summary: 'Get RTP configuration and theoretical math presets' })
  async getRtpConfig() {
    return this.adminService.getRtpConfig();
  }

  @Post('system/rtp')
  @ApiOperation({ summary: '[Creator Only] Set platform target RTP percentage' })
  async setRtpConfig(
    @Request() req: any,
    @Body() body: { targetRtp: number },
  ) {
    return this.adminService.setRtpConfig(req.user, body.targetRtp);
  }

  /* ────────────────── STAFF MANAGEMENT (CREATOR & OWNER) ────────────────── */

  @Get('staff')
  @ApiOperation({ summary: 'List staff accounts with role segmentation' })
  async listStaff(@Request() req: any) {
    return this.adminService.listStaff(req.user);
  }

  @Post('staff')
  @ApiOperation({ summary: 'Create a new staff account (Creator: Owner/Operator, Owner: Operator only)' })
  async createStaff(
    @Request() req: any,
    @Body() body: { phone: string; username: string; password: string; role: UserRole; email?: string },
  ) {
    return this.adminService.createStaff(req.user, body);
  }

  @Put('staff/:id')
  @ApiOperation({ summary: 'Edit a staff account' })
  async updateStaff(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { phone?: string; username?: string; password?: string; status?: UserStatus; role?: UserRole },
  ) {
    return this.adminService.updateStaff(req.user, id, body);
  }

  @Delete('staff/:id')
  @ApiOperation({ summary: 'Delete a staff account' })
  async deleteStaff(@Request() req: any, @Param('id') id: string) {
    return this.adminService.deleteStaff(req.user, id);
  }

  /* ────────────────── PLAYER MANAGEMENT & FREEZE ────────────────── */

  @Get('players')
  @ApiOperation({ summary: 'List registered players with status and wallet balances' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  async listPlayers(
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listPlayers(search, status);
  }

  @Post('players/:id/status')
  @ApiOperation({ summary: 'Activate or Freeze a player account' })
  async setPlayerStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { status: UserStatus; reason?: string },
  ) {
    return this.adminService.setUserStatus(req.user, id, body.status, body.reason);
  }

  @Post('players/:id/toggle-exclusion')
  @ApiOperation({ summary: 'Admin toggle self-exclusion: stop or apply exclusion on player' })
  async togglePlayerExclusion(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { action: 'STOP' | 'EXCLUDE'; durationDays?: number; reason?: string },
  ) {
    return this.adminService.togglePlayerExclusion(req.user, id, body.action, body.durationDays, body.reason);
  }

  /* ────────────────── WITHDRAWAL REVIEW: FULL USER TRANSACTION HISTORY ────────────────── */

  @Get('users/:id/financial-history')
  @ApiOperation({ summary: 'Fetch complete transaction history and lifetime stats for withdrawal approval review' })
  async getUserFinancialHistory(@Param('id') id: string) {
    return this.adminService.getUserFinancialHistory(id);
  }

  /* ────────────────── PROFIT AUDIT (DAILY, WEEKLY, MONTHLY) ────────────────── */

  @Get('audits/profit')
  @ApiOperation({ summary: 'Financial & profit audits (Operator: daily only; Owner/Creator: daily, weekly, monthly)' })
  @ApiQuery({ name: 'period', enum: ['daily', 'weekly', 'monthly'] })
  async getProfitAudit(
    @Request() req: any,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    return this.adminService.getProfitAudit(req.user, period);
  }
}
