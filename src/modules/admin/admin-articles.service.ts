import { Injectable, BadRequestException } from '@nestjs/common';
import { TRAINING_STATUS } from '../../common/constants/training-status.constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { TrainingFlowService } from '../training-flow/training-flow.service';

@Injectable()
export class AdminArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trainingFlowService: TrainingFlowService,
  ) {}

  /**
   * Verifikasi artikel oleh admin
   */
  async verify(userId: string, comment?: string) {
    const flow = await this.prisma.userTrainingFlow.findUnique({
      where: { userId },
    });

    if (!flow) {
      throw new BadRequestException('Training flow not found');
    }

    if (flow.statusCode !== TRAINING_STATUS.ARTICLE_WAITING) {
      throw new BadRequestException('Invalid flow status');
    }

    await this.trainingFlowService.transitionStatus({
      userId,
      nextStatus: TRAINING_STATUS.ARTICLE_VERIFIED,
      actorId: 'ADMIN',
      metadata: {
        action: 'VERIFY_ARTICLE',
        comment,
      },
    });

    return { message: 'Article verified successfully' };
  }

  /**
   * Tolak / pending verifikasi artikel (future use)
   * Status tetap ARTICLE_WAITING
   */
  async reject(userId: string, comment?: string) {
    const flow = await this.prisma.userTrainingFlow.findUnique({
      where: { userId },
    });

    if (!flow) {
      throw new BadRequestException('Training flow not found');
    }

    if (flow.statusCode !== TRAINING_STATUS.ARTICLE_WAITING) {
      throw new BadRequestException('Invalid flow status');
    }

    // Tidak ada transisi status
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_PROFILE', // pakai AuditAction existing
        metadata: {
          action: 'REJECT_ARTICLE',
          comment,
        },
      },
    });

    return { message: 'Article verification rejected (no status change)' };
  }
}
