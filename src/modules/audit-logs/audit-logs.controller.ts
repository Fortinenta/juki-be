import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/common/decorators/roles.decorator';
import { QueryAuditLogsDto } from './dto/audit-logs.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('audit-logs')
@UseGuards(AuthGuard('jwt'))
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
  @Roles('ADMIN', 'SUPER_ADMIN')
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
