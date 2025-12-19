import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrainingFlowService } from '../training-flow/training-flow.service';
import { TRAINING_STATUS } from '../../common/constants/training-status.constants';

@Injectable()
export class AdminAdministrativeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trainingFlowService: TrainingFlowService,
  ) {}

  async completeAdministrative(userId: string, adminId: string) {
    await this.trainingFlowService.transitionStatus({
      userId,
      nextStatus: TRAINING_STATUS.WAITING_ADMINISTRATIVE,
      actorId: adminId,
      metadata: { action: 'COMPLETE_ADMINISTRATIVE' },
    });

    return { message: 'Administrative requirements completed' };
  }

  async createOjsAccount(
    userId: string,
    data: { username: string; password: string; journalCode: string; journalLink: string },
    adminId: string,
  ) {
    const flow = await this.prisma.userTrainingFlow.findUnique({ where: { userId } });

    if (!flow) {
      throw new BadRequestException('Training flow not found');
    }

    if (flow.ojsAccountId) {
      throw new BadRequestException('OJS account already assigned');
    }

    const ojs = await this.prisma.ojsAccount.create({
      data,
    });

    await this.prisma.userTrainingFlow.update({
      where: { userId },
      data: { ojsAccountId: ojs.id },
    });

    await this.trainingFlowService.transitionStatus({
      userId,
      nextStatus: TRAINING_STATUS.ARTICLE_WAITING,
      actorId: adminId,
      metadata: {
        action: 'ASSIGN_OJS_ACCOUNT',
        ojsId: ojs.id,
      },
    });

    return { message: 'OJS account created and article submission opened' };
  }
}
