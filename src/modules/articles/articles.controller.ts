import { Post, Get, UseGuards, UseInterceptors, UploadedFile, Req, Controller, BadRequestException, StreamableFile, Res, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FlowStatusGuard } from '../../common/guards/flow-status.guard';
import { FlowStatus } from '../../common/decorators/flow-status.decorator';
import { ArticlesService } from './articles.service';
import type { Request, Response } from 'express';
import { TRAINING_STATUS } from '../../common/constants/training-status.constants';
import { JwtUser } from '../auth/types/jwt-user.type';
import * as path from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { createReadStream } from 'fs';

@Controller('articles')
@UseGuards(JwtAuthGuard, FlowStatusGuard)
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post('upload')
  @FlowStatus(TRAINING_STATUS.ARTICLE_WAITING)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = path.join(process.cwd(), 'uploads', 'articles');
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
          const uniqueName = `${crypto.randomUUID()}-${sanitized}`;
          cb(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        const allowedExts = ['.pdf', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();

        if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
          return cb(new BadRequestException('Only document files (pdf, doc, docx) are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadArticle(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const request = req as Request & { user: JwtUser };
    const userId = request.user.id;

    return this.articlesService.uploadArticle({
      userId,
      file,
    });
  }

  @Get('loa')
  async downloadLoa(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const userId = req.user.id;
    const loa = await this.articlesService.getLoaFile(userId);

    if (!fs.existsSync(loa.path)) {
      throw new NotFoundException('LOA file not found on server');
    }

    const file = createReadStream(loa.path);
    res.set({
      'Content-Type': loa.mimeType,
      'Content-Disposition': `attachment; filename="${loa.filename}"`,
    });
    return new StreamableFile(file);
  }
}
