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

  async setJournalCode(userId: string, journalCode: string, adminId: string) {
    // Validasi journalCode
    const validJournals = ['JIE', 'JOFEI', 'JOESMENT'];
    if (!validJournals.includes(journalCode)) {
      throw new BadRequestException(
        `Invalid journal code. Must be one of: ${validJournals.join(', ')}`,
      );
    }

    // Cek apakah journal code valid di database
    const journal = await this.prisma.lookupJournal.findUnique({
      where: { code: journalCode, isActive: true },
    });

    if (!journal) {
      throw new BadRequestException('Journal not found or inactive');
    }

    // Cek apakah user sudah memilih training
    const flow = await this.prisma.userTrainingFlow.findUnique({
      where: { userId },
      select: { trainingId: true },
    });

    if (flow?.trainingId) {
      throw new BadRequestException(
        'Cannot change journal group after user has selected a training schedule',
      );
    }

    // Update journalCode di user training flow
    await this.prisma.userTrainingFlow.update({
      where: { userId },
      data: { journalCode },
    });

    return {
      message: 'Journal code set successfully',
      journalCode,
      journalName: journal.name,
      setBy: 'admin',
    };
  }

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

    // Validasi journalCode
    const validJournals = ['JIE', 'JOFEI', 'JOESMENT'];
    if (!validJournals.includes(data.journalCode)) {
      throw new BadRequestException(
        `Invalid journal code. Must be one of: ${validJournals.join(', ')}`,
      );
    }

    const ojs = await this.prisma.ojsAccount.create({
      data,
    });

    await this.prisma.userTrainingFlow.update({
      where: { userId },
      data: { 
        ojsAccountId: ojs.id,
        journalCode: data.journalCode, // Sync journalCode to flow table
      },
    });

    await this.trainingFlowService.transitionStatus({
      userId,
      nextStatus: TRAINING_STATUS.ARTICLE_WAITING,
      actorId: adminId,
      metadata: {
        action: 'ASSIGN_OJS_ACCOUNT',
        ojsId: ojs.id,
        journalCode: data.journalCode,
      },
    });

    return { message: 'OJS account created and article submission opened' };
  }
}
