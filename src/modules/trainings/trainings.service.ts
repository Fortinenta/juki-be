import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrainingFlowService } from '../training-flow/training-flow.service';
import { TRAINING_STATUS } from '../../common/constants/training-status.constants';

@Injectable()
export class TrainingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trainingFlowService: TrainingFlowService,
  ) {}

  /**
   * Get list of available trainings
   * If userId provided (authenticated), filter by user's journalCode
   * If no userId (public), show all available trainings
   */
  async getAvailableTrainings(userId?: string) {
    const whereCondition: any = {
      startAt: {
        gt: new Date(), // Hanya tampilkan training di masa depan
      },
      quota: {
        gt: 0, // Hanya tampilkan yang kuotanya masih ada
      },
    };

    // Jika user sudah login, filter berdasarkan journalCode user
    if (userId) {
      const flow = await this.prisma.userTrainingFlow.findUnique({
        where: { userId },
        select: { journalCode: true },
      });

      // Jika user sudah memilih journalCode, filter training berdasarkan journalCode tersebut
      if (flow?.journalCode) {
        whereCondition.journalCode = flow.journalCode;
      }
    }

    return this.prisma.training.findMany({
      where: whereCondition,
      orderBy: {
        startAt: 'asc',
      },
    });
  }

  /**
   * Get details of a specific training
   */
  async getTrainingById(id: string) {
    const training = await this.prisma.training.findUnique({
      where: { id },
    });

    if (!training) {
      throw new NotFoundException('Training schedule not found');
    }

    return training;
  }

  /**
   * Select a training batch for a user
   * Transisi: ARTICLE_VERIFIED -> TRAINING_WAITING
   */
  async selectTraining(userId: string, trainingId: string) {
    // 2. Transaksi Database (Atomic) untuk mencegah Race Condition pada Quota
    return this.prisma.$transaction(async (tx) => {
      // 1. Cek Flow User saat ini (INSIDE TRANSACTION untuk locking)
      const flow = await tx.userTrainingFlow.findUnique({
        where: { userId },
      });

      if (!flow) {
        throw new NotFoundException('User training flow not found');
      }

      // Validasi: User harus sudah memilih journal sebelum memilih training
      if (!flow.journalCode) {
        throw new BadRequestException(
          'Please select a journal group first before choosing a training schedule.',
        );
      }

      // Pastikan user berada di tahap yang benar untuk memilih jadwal
      // Idealnya setelah ARTICLE_VERIFIED, user memilih jadwal
      // Jika user sudah TRAINING_WAITING tapi belum punya trainingId (migrasi data lama), kita izinkan juga
      // Jika user TRAINING_RESCHEDULE (tidak hadir sebelumnya), juga diizinkan
      if (
        flow.statusCode !== TRAINING_STATUS.ARTICLE_VERIFIED &&
        flow.statusCode !== TRAINING_STATUS.TRAINING_RESCHEDULE &&
        !(flow.statusCode === TRAINING_STATUS.TRAINING_WAITING && flow.trainingId === null)
      ) {
        throw new BadRequestException(
          'You are not eligible to select a training schedule at this stage. Please complete the article verification first.',
        );
      }

      // CRITICAL: Check if user already has training (prevent double selection)
      if (flow.trainingId) {
        throw new ConflictException('You have already selected a training schedule.');
      }

      // 2a. Ambil data training
      const training = await tx.training.findUnique({
        where: { id: trainingId },
      });

      if (!training) {
        throw new NotFoundException('Training schedule not found');
      }

      // Validasi: Training harus sesuai dengan journalCode user
      if (training.journalCode !== flow.journalCode) {
        throw new BadRequestException(
          `This training is for ${training.journalCode} journal group. You are registered for ${flow.journalCode}.`,
        );
      }

      if (training.quota <= 0) {
        throw new ConflictException('This training batch is full.');
      }

      if (new Date(training.startAt) <= new Date()) {
        throw new BadRequestException('Cannot select a past training schedule.');
      }

      // 2b. Update User Training Flow FIRST (to lock the user)
      const updatedFlow = await tx.userTrainingFlow.update({
        where: { userId },
        data: {
          trainingId: trainingId,
          statusCode: TRAINING_STATUS.TRAINING_WAITING,
        },
      });

      // 2c. Kurangi Quota AFTER user is locked
      await tx.training.update({
        where: { id: trainingId },
        data: {
          quota: {
            decrement: 1,
          },
        },
      });
      
      return updatedFlow;
    });
  }

  /**
   * Get training details for the logged-in user
   */
  async getMyTraining(userId: string) {
    const flow = await this.prisma.userTrainingFlow.findUnique({
      where: { userId },
      include: {
        training: true,
        status: true,
      },
    });

    if (!flow || !flow.trainingId) {
      return {
        hasTraining: false,
        flowStatus: flow?.status || null,
        training: null,
      };
    }

    return {
      hasTraining: true,
      flowStatus: flow.status,
      training: flow.training,
    };
  }

  /**
   * Cancel training selection (return quota)
   * User can cancel if training is at least 3 days away
   */
  async cancelTraining(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const flow = await tx.userTrainingFlow.findUnique({
        where: { userId },
        include: { training: true },
      });

      if (!flow || !flow.trainingId) {
        throw new BadRequestException('You have not selected any training schedule');
      }

      if (flow.statusCode !== TRAINING_STATUS.TRAINING_WAITING) {
        throw new BadRequestException('Cannot cancel training at this stage');
      }

      const training = flow.training;
      if (!training) {
        throw new NotFoundException('Training not found');
      }

      // Check if training is at least 3 days away (H-3)
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      if (new Date(training.startAt) < threeDaysFromNow) {
        throw new BadRequestException(
          'Cannot cancel training less than 3 days before the event. Please contact admin.',
        );
      }

      // Return quota
      await tx.training.update({
        where: { id: flow.trainingId },
        data: {
          quota: {
            increment: 1,
          },
        },
      });

      // Remove training from user flow and revert status
      const updatedFlow = await tx.userTrainingFlow.update({
        where: { userId },
        data: {
          trainingId: null,
          statusCode: TRAINING_STATUS.ARTICLE_VERIFIED,
        },
      });

      return {
        message: 'Training cancelled successfully. You can select a new schedule.',
        updatedFlow,
      };
    });
  }
}
