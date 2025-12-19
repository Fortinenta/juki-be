import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrainingFlowService } from '../training-flow/training-flow.service';
// import { TRAINING_STATUS } from '../../common/constants/training-status.constants';

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trainingFlowService: TrainingFlowService,
  ) {}

  /**
   * Upload artikel oleh mahasiswa
   * - Simpan ke Attachment
   * - Status tetap ARTICLE_WAITING (menunggu verifikasi admin)
   */
  async uploadArticle(params: { userId: string; file: Express.Multer.File }) {
    const { userId, file } = params;

    if (!file) {
      throw new BadRequestException('Article file is required');
    }

    // Simpan attachment artikel
    await this.prisma.attachment.create({
      data: {
        userId,
        type: 'ARTICLE',
        filePath: file.path,
        mimeType: file.mimetype,
        originalName: file.originalname,
        size: file.size,
      },
    });

    // Tidak mengubah status (tetap ARTICLE_WAITING)
    // Verifikasi dilakukan oleh ADMIN

    return {
      message: 'Article uploaded successfully. Waiting for admin review.',
    };
  }
}
