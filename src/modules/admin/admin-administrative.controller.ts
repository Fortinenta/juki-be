import { Controller, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminAdministrativeService } from './admin-administrative.service';

@Controller('admin/administrative')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminAdministrativeController {
  constructor(private readonly service: AdminAdministrativeService) {}

  /**
   * Set journal code untuk user (oleh admin)
   * Bisa dilakukan kapan saja sebelum user memilih training
   */
  @Post(':userId/set-journal')
  async setJournalCode(
    @Param('userId') userId: string,
    @Body('journalCode') journalCode: string,
    @Req() req: any,
  ) {
    return this.service.setJournalCode(userId, journalCode, req.user.id);
  }

  /**
   * Menandai administrasi lengkap
   * ADMINISTRATIVE_REQUIRED -> WAITING_ADMINISTRATIVE
   */
  @Post(':userId/complete')
  async completeAdministrative(@Param('userId') userId: string, @Req() req: any) {
    return this.service.completeAdministrative(userId, req.user.id);
  }

  /**
   * Input akun OJS oleh admin
   * WAITING_ADMINISTRATIVE -> ARTICLE_WAITING
   */
  @Post(':userId/ojs')
  async createOjsAccount(
    @Param('userId') userId: string,
    @Body() body: { username: string; password: string; journalCode: string; journalLink: string },
    @Req() req: any,
  ) {
    return this.service.createOjsAccount(userId, body, req.user.id);
  }
}
