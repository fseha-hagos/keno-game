import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('recent')
  @ApiOperation({ summary: '[Admin Only] List recent system audit logs' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  async getRecentLogs(@Request() req: any, @Query('limit') limit = 50) {
    if (
      !req.user.roles?.some((r: string) =>
        ['SUPER_ADMIN', 'FINANCE', 'GAME_OPERATOR', 'AUDITOR'].includes(r),
      )
    ) {
      throw new ForbiddenException('Admin / Auditor only');
    }
    return this.auditService.findRecent(Number(limit));
  }
}
