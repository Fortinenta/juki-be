import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrainingFlowService } from '../training-flow/training-flow.service';
import { TRAINING_STATUS } from '../../common/constants/training-status.constants';

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trainingFlowService: TrainingFlowService,
  ) {}

  /**
   * User confirms they have submitted the article to external OJS
   * Status remains ARTICLE_WAITING until verified by Admin
   */
  async confirmSubmission(userId: string, articleTitle: string) {
    const flow = await this.prisma.userTrainingFlow.findUnique({
      where: { userId },
    });

    if (!flow || flow.statusCode !== TRAINING_STATUS.ARTICLE_WAITING) {
      throw new BadRequestException('Action not allowed in current status');
    }

    await this.prisma.userTrainingFlow.update({
      where: { userId },
      data: { articleTitle },
    });

    await this.trainingFlowService.transitionStatus({
      userId,
      nextStatus: TRAINING_STATUS.ARTICLE_WAITING,
      actorId: userId,
      metadata: { action: 'CONFIRM_OJS_SUBMISSION', articleTitle },
    });

    return {
      message: 'Submission confirmed. Admin will verify your article in OJS.',
    };
  }

  /**
   * User confirm revision done on external OJS
   * Status: REVIEW_REVISION -> REVIEW_WAITING
   */
  async confirmRevision(userId: string) {
    const flow = await this.prisma.userTrainingFlow.findUnique({
      where: { userId },
    });

    if (!flow || flow.statusCode !== TRAINING_STATUS.REVIEW_REVISION) {
      throw new BadRequestException('Action not allowed in current status');
    }

    await this.trainingFlowService.transitionStatus({
      userId,
      nextStatus: TRAINING_STATUS.REVIEW_WAITING,
      actorId: userId,
      metadata: { action: 'CONFIRM_REVISION_DONE' },
    });

    return { message: 'Revision confirmed. Waiting for admin review.' };
  }

  async getLoaFile(userId: string) {
    const loa = await this.prisma.attachment.findFirst({
      where: {
        userId,
        type: 'LOA',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!loa) {
      throw new NotFoundException('LOA not found for this user');
    }

    return {
      path: loa.filePath,
      mimeType: loa.mimeType,
      filename: loa.originalName || 'LOA.pdf',
    };
  }
}