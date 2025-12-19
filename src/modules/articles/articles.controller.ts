import { Post, UseGuards, UseInterceptors, UploadedFile, Req, Controller } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FlowStatusGuard } from '../../common/guards/flow-status.guard';
import { FlowStatus } from '../../common/decorators/flow-status.decorator';
import { ArticlesService } from './articles.service';
import { Request } from 'express';
import { TRAINING_STATUS } from '../../common/constants/training-status.constants';
import { JwtUser } from '../auth/types/jwt-user.type';

@Controller('articles')
@UseGuards(JwtAuthGuard, FlowStatusGuard)
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post('upload')
  @FlowStatus(TRAINING_STATUS.ARTICLE_WAITING)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/articles',
        filename: (_req, file, cb) => {
          const uniqueName = `${Date.now()}-${file.originalname}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(pdf|doc|docx)$/)) {
          return cb(new Error('Only document files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadArticle(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request & { user: JwtUser },
  ) {
    const userId = req.user.id;

    return this.articlesService.uploadArticle({
      userId,
      file,
    });
  }
}
