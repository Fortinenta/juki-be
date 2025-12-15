import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('user/:userId')
  async findAllByUserId(
    @Param('userId') userId: string,
    @CurrentUser('userId') currentUserId: string,
  ) {
    return this.sessionsService.findAllByUserId(userId, currentUserId);
  }

  @Get('me')
  async getMySession(@CurrentUser('userId') userId: string) {
    return this.sessionsService.findAllByUserId(userId, userId);
  }

  @Delete(':sessionId/user/:userId')
  async revokeSession(
    @Param('sessionId') sessionId: string,
    @Param('userId') userId: string,
    @CurrentUser('userId') currentUserId: string,
  ) {
    return this.sessionsService.revokeSession(sessionId, userId, currentUserId);
  }

  @Delete('user/:userId/all')
  async revokeAllSessions(
    @Param('userId') userId: string,
    @CurrentUser('userId') currentUserId: string,
  ) {
    return this.sessionsService.revokeAllSessions(userId, currentUserId);
  }

  @Delete('cleanup')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async cleanupExpiredSessions() {
    return this.sessionsService.cleanupExpiredSessions();
  }
}
