import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrainingFlowService } from '../training-flow/training-flow.service';
import { TRAINING_STATUS } from '../../common/constants/training-status.constants';

@Injectable()
export class AdminReviewLoaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trainingFlowService: TrainingFlowService,
  ) {}

  async acceptReview(userId: string, comment?: string) {
    const flow = await this.prisma.userTrainingFlow.findUnique({
      where: { userId },
    });

    if (!flow || flow.statusCode !== TRAINING_STATUS.TRAINING_VERIFIED) {
      throw new BadRequestException('Invalid flow state');
    }

    await this.trainingFlowService.transitionStatus({
      userId,
      nextStatus: TRAINING_STATUS.REVIEW_VERIFIED,
      actorId: 'ADMIN',
      metadata: { comment },
    });

    await this.trainingFlowService.transitionStatus({
      userId,
      nextStatus: TRAINING_STATUS.LOA_WAITING,
      actorId: 'SYSTEM',
    });

    return { message: 'Review accepted, waiting for LOA' };
  }

  async revisionReview(userId: string, comment?: string) {
    const flow = await this.prisma.userTrainingFlow.findUnique({
      where: { userId },
    });

    if (!flow || flow.statusCode !== TRAINING_STATUS.TRAINING_VERIFIED) {
      throw new BadRequestException('Invalid flow state');
    }

    await this.trainingFlowService.transitionStatus({
      userId,
      nextStatus: TRAINING_STATUS.REVIEW_REVISION,
      actorId: 'ADMIN',
      metadata: { comment },
    });

    return { message: 'Review marked as revision' };
  }

  async uploadLoa(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('LOA file required');

    const flow = await this.prisma.userTrainingFlow.findUnique({
      where: { userId },
    });

    if (!flow || flow.statusCode !== TRAINING_STATUS.LOA_WAITING) {
      throw new BadRequestException('Not in LOA waiting state');
    }

    await this.prisma.attachment.create({
      data: {
        userId,
        type: 'LOA',
        filePath: file.path,
        mimeType: file.mimetype,
        originalName: file.originalname,
        size: file.size,
      },
    });

    await this.trainingFlowService.transitionStatus({
      userId,
      nextStatus: TRAINING_STATUS.LOA_PUBLISHED,
      actorId: 'ADMIN',
      metadata: { action: 'UPLOAD_LOA' },
    });

    return { message: 'LOA issued successfully' };
  }
}
