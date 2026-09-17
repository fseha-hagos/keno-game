import { Controller, Get, Post, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ResponsibleGamblingService } from './responsible-gambling.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SetLimitInput, SelfExclusionInput } from '@keno/validation';

@ApiTags('Responsible Gambling')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/limits')
export class ResponsibleGamblingController {
  constructor(private readonly rgService: ResponsibleGamblingService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user active responsible gambling limits' })
  async getLimits(@Request() req: any) {
    return this.rgService.getUserLimits(req.user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Set or update a responsible gambling limit' })
  async setLimit(@Request() req: any, @Body() body: SetLimitInput) {
    return this.rgService.setLimit(
      req.user.id,
      body.limitType,
      body.duration,
      body.amountMinor,
      body.durationMinutes,
    );
  }

  @Post('self-exclude')
  @ApiOperation({ summary: 'Request self-exclusion from betting' })
  async selfExclude(@Request() req: any, @Body() body: SelfExclusionInput) {
    return this.rgService.selfExclude(req.user.id, body.durationDays, body.reason);
  }
}
