import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { AdminReviewLoaService } from './admin-review-loa.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';

import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

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
  async acceptReview(
    @Param('userId') userId: string,
    @Body('comment') comment: string | undefined,
    @CurrentUser() admin: JwtUser,
  ) {
    return this.service.acceptReview(userId, admin.id, comment);
  }

  /**
   * Review akhir artikel - REVISION
   * TRAINING_VERIFIED -> REVIEW_REVISION
   */
  @Post(':userId/review/revision')
  async revisionReview(
    @Param('userId') userId: string,
    @Body('comment') comment: string | undefined,
    @CurrentUser() admin: JwtUser,
  ) {
    return this.service.revisionReview(userId, admin.id, comment);
  }

  /**
   * Upload & issue LOA
   * LOA_WAITING -> LOA_ISSUED
   */
  @Post(':userId/loa/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          try {
            const uploadPath = path.resolve(process.cwd(), 'uploads', 'loa');
            if (!fs.existsSync(uploadPath)) {
              fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
          } catch (err) {
            console.error('[Multer] Destination error:', err);
            cb(err as Error, '');
          }
        },
        filename: (_req, file, cb) => {
          try {
            const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            const uniqueName = `${crypto.randomUUID()}-${sanitized}`;
            cb(null, uniqueName);
          } catch (err) {
            console.error('[Multer] Filename error:', err);
            cb(err as Error, '');
          }
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(pdf)$/)) {
          return cb(new BadRequestException('Only PDF files are allowed'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // Tingkatkan limit ke 10MB untuk PDF
      },
    }),
  )
  async uploadLoa(
    @Param('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() admin: JwtUser,
  ) {
    if (!admin || !admin.id) {
      throw new UnauthorizedException('Admin identification failed. Please re-login.');
    }
    if (!file) {
      throw new BadRequestException('File upload failed or file is missing.');
    }
    return this.service.uploadLoa(userId, admin.id, file);
  }
}
