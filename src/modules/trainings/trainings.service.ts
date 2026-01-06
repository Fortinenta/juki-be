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
   * Get list of available trainings (Public)
   * Shows future trainings with available quota
   */
  async getAvailableTrainings() {
    return this.prisma.training.findMany({
      where: {
        startAt: {
          gt: new Date(), // Hanya tampilkan training di masa depan
        },
        quota: {
          gt: 0, // Hanya tampilkan yang kuotanya masih ada
        },
      },
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
    // 1. Cek Flow User saat ini
    const flow = await this.trainingFlowService.getFlowByUserId(userId);

    // Pastikan user berada di tahap yang benar untuk memilih jadwal
    // Idealnya setelah ARTICLE_VERIFIED, user memilih jadwal
    // Jika user sudah TRAINING_WAITING tapi belum punya trainingId (migrasi data lama), kita izinkan juga
    if (
      flow.statusCode !== TRAINING_STATUS.ARTICLE_VERIFIED && 
      !(flow.statusCode === TRAINING_STATUS.TRAINING_WAITING && flow.trainingId === null)
    ) {
      throw new BadRequestException(
        'You are not eligible to select a training schedule at this stage. Please complete the article verification first.',
      );
    }

    if (flow.trainingId) {
      throw new ConflictException('You have already selected a training schedule.');
    }

    // 2. Transaksi Database (Atomic) untuk mencegah Race Condition pada Quota
    return this.prisma.$transaction(async (tx) => {
      // 2a. Ambil data training dengan lock (opsional, tapi findUnique cukup aman untuk update atomic decrement)
      const training = await tx.training.findUnique({
        where: { id: trainingId },
      });

      if (!training) {
        throw new NotFoundException('Training schedule not found');
      }

      if (training.quota <= 0) {
        throw new ConflictException('This training batch is full.');
      }

      if (new Date(training.startAt) <= new Date()) {
        throw new BadRequestException('Cannot select a past training schedule.');
      }

      // 2b. Kurangi Quota
      await tx.training.update({
        where: { id: trainingId },
        data: {
          quota: {
            decrement: 1,
          },
        },
      });

      // 2c. Update User Training Flow
      // Kita set trainingId DAN update status ke TRAINING_WAITING
      // Gunakan trainingFlowService logic jika ingin mencatat audit log via service itu, 
      // tapi karena kita butuh atomic transaction dengan quota training, kita update manual di sini
      // atau panggil method transisi jika support tx, tapi saat ini kita direct update userTrainingFlow dalam tx ini.
      
      const updatedFlow = await tx.userTrainingFlow.update({
        where: { userId },
        data: {
          trainingId: trainingId,
          statusCode: TRAINING_STATUS.TRAINING_WAITING, // Memastikan status maju ke WAITING
        },
      });
      
      return updatedFlow;
    });
  }
}
