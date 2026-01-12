import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AdminArticlesService } from './admin-articles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { VerifyArticleDto } from './dto/admin-articles.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';

@Controller('admin/articles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminArticlesController {
  constructor(private readonly adminArticlesService: AdminArticlesService) {}

  /**
   * Admin verifikasi artikel (manual check di OJS eksternal)
   * ARTICLE_WAITING -> ARTICLE_VERIFIED
   */
  @Post(':userId/verify')
  async verifyArticle(
    @Param('userId') userId: string,
    @Body() dto: VerifyArticleDto,
    @CurrentUser() admin: JwtUser,
  ) {
    return this.adminArticlesService.verify(userId, admin.id, dto.comment);
  }

  /**
   * Admin menolak / menunda verifikasi artikel (future-proof)
   * Status TIDAK berubah (tetap ARTICLE_WAITING)
   */
  @Post(':userId/reject')
  async rejectArticle(
    @Param('userId') userId: string,
    @Body() dto: VerifyArticleDto,
    @CurrentUser() admin: JwtUser,
  ) {
    return this.adminArticlesService.reject(userId, admin.id, dto.comment);
  }
}
