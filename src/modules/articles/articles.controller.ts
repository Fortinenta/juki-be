import {
  Post,
  Get,
  UseGuards,
  Req,
  Controller,
  BadRequestException,
  StreamableFile,
  Res,
  NotFoundException,
  Body,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FlowStatusGuard } from '../../common/guards/flow-status.guard';
import { FlowStatus } from '../../common/decorators/flow-status.decorator';
import { ArticlesService } from './articles.service';
import type { Response } from 'express';
import { TRAINING_STATUS } from '../../common/constants/training-status.constants';
import * as fs from 'fs';
import { createReadStream } from 'fs';

@Controller('articles')
@UseGuards(JwtAuthGuard, FlowStatusGuard)
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post('confirm-submission')
  @FlowStatus(TRAINING_STATUS.ARTICLE_WAITING)
  async confirmSubmission(@Req() req: any, @Body('articleTitle') articleTitle: string) {
    if (!articleTitle) {
      throw new BadRequestException('Article title is required');
    }
    const userId = req.user.id;
    return this.articlesService.confirmSubmission(userId, articleTitle);
  }

  @Post('confirm-revision')
  async confirmRevision(@Req() req: any) {
    const userId = req.user.id;
    return this.articlesService.confirmRevision(userId);
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
