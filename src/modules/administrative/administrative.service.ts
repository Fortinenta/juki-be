import { Injectable } from '@nestjs/common';
import { TrainingFlowService } from '../training-flow/training-flow.service';
import { TRAINING_STATUS } from '../../common/constants/training-status.constants';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdministrativeService {
  constructor(
    private readonly trainingFlowService: TrainingFlowService,
    private readonly prisma: PrismaService,
  ) {}

  async startAdministrative(userId: string) {
    await this.trainingFlowService.transitionStatus({
      userId,
      nextStatus: TRAINING_STATUS.ADMINISTRATIVE_REQUIRED,
      actorId: userId,
      metadata: { action: 'START_ADMINISTRATIVE_STAGE' },
    });

    return { message: 'Started administrative stage. Please fill the form.' };
  }

  async confirmAdministrative(userId: string) {
    // User hanya konfirmasi bahwa sudah mengisi form
    // Tidak perlu validasi journal karena akan di-set oleh admin
    const flow = await this.prisma.userTrainingFlow.findUnique({
      where: { userId },
      select: { journalCode: true },
    });

    await this.trainingFlowService.transitionStatus({
      userId,
      nextStatus: TRAINING_STATUS.WAITING_ADMINISTRATIVE,
      actorId: userId,
      metadata: {
        action: 'CONFIRM_ADMINISTRATIVE_FORM',
        journalCode: flow?.journalCode || null,
      },
    });

    return {
      message: 'Administrative form submission confirmed. Waiting for admin verification.',
      journalSelected: !!flow?.journalCode,
      journalCode: flow?.journalCode || null,
    };
  }

  async getAvailableJournals() {
    return this.prisma.lookupJournal.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
  }
}
