import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@keno/shared-types';

@ApiTags('Reporting & Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('rtp')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GAME_OPERATOR, UserRole.AUDITOR, UserRole.FINANCE)
  @ApiOperation({ summary: 'Get Theoretical vs Observed RTP Report' })
  async getRtpReport() {
    return this.reportingService.getRtpReport();
  }
}
