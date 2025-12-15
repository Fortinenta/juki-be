import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogsDto } from './dto/audit-logs.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  async findAll(@Query() query: QueryAuditLogsDto, @CurrentUser('role') currentUserRole: string) {
    return this.auditLogsService.findAll(query, currentUserRole);
  }

  @Get('stats')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getStats(@CurrentUser('role') currentUserRole: string) {
    return this.auditLogsService.getStats(currentUserRole);
  }

  @Get('user/:userId')
  async findByUserId(
    @Param('userId') userId: string,
    @CurrentUser('userId') currentUserId: string,
    @CurrentUser('role') currentUserRole: string,
  ) {
    return this.auditLogsService.findByUserId(userId, currentUserId, currentUserRole);
  }

  @Get('me')
  async getMyAuditLogs(@CurrentUser('userId') userId: string, @CurrentUser('role') role: string) {
    return this.auditLogsService.findByUserId(userId, userId, role);
  }
}
