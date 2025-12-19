import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { AdminReviewLoaService } from './admin-review-loa.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/review-loa')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminReviewLoaController {
  constructor(private readonly service: AdminReviewLoaService) {}

  /**
   * Review akhir artikel - ACCEPTED
   * TRAINING_VERIFIED -> REVIEW_ACCEPTED
   */
  @Post(':userId/review/accept')
  async acceptReview(@Param('userId') userId: string, @Body('comment') comment?: string) {
    return this.service.acceptReview(userId, comment);
  }

  /**
   * Review akhir artikel - REVISION
   * TRAINING_VERIFIED -> REVIEW_REVISION
   */
  @Post(':userId/review/revision')
  async revisionReview(@Param('userId') userId: string, @Body('comment') comment?: string) {
    return this.service.revisionReview(userId, comment);
  }

  /**
   * Upload & issue LOA
   * LOA_WAITING -> LOA_ISSUED
   */
  @Post(':userId/loa/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/loa',
        filename: (_req, file, cb) => {
          const uniqueName = `${Date.now()}-${file.originalname}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(pdf)$/)) {
          return cb(new Error('Only PDF files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadLoa(@Param('userId') userId: string, @UploadedFile() file: Express.Multer.File) {
    return this.service.uploadLoa(userId, file);
  }
}
