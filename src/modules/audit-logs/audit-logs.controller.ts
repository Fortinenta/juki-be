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
  async findAll(@Query() query: QueryAuditLogsDto, @CurrentUser('roles') currentUserRoles: string[]) {
    return this.auditLogsService.findAll(query, currentUserRoles);
  }

  @Get('stats')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getStats(@CurrentUser('roles') currentUserRoles: string[]) {
    return this.auditLogsService.getStats(currentUserRoles);
  }

  @Get('user/:userId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async findByUserId(
    @Param('userId') userId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('roles') currentUserRoles: string[],
  ) {
    return this.auditLogsService.findByUserId(userId, currentUserId, currentUserRoles);
  }

  @Get('me')
  async getMyAuditLogs(@CurrentUser('id') userId: string, @CurrentUser('roles') roles: string[]) {
    return this.auditLogsService.findByUserId(userId, userId, roles);
  }
}
