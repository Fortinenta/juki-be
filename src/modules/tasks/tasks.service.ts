import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { TRAINING_STATUS } from '../../common/constants/training-status.constants';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Run every day at midnight (00:00)
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleTrainingAbsences() {
    this.logger.log('Running automated check for expired trainings...');

    // 1. Calculate the cutoff time (e.g., trainings that ended more than 24 hours ago)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // 2. Find trainings that ended before the cutoff time
    const expiredTrainings = await this.prisma.training.findMany({
      where: {
        endAt: {
          lt: twentyFourHoursAgo,
        },
      },
      select: { id: true, title: true, batch: true },
    });

    if (expiredTrainings.length === 0) {
      this.logger.log('No expired trainings found requiring action.');
      return;
    }

    let totalUpdated = 0;

    for (const training of expiredTrainings) {
      // 3. Find users in this training who are still 'TRAINING_WAITING'
      // These are users the admin forgot to mark as PRESENT or ABSENT
      const result = await this.prisma.userTrainingFlow.updateMany({
        where: {
          trainingId: training.id,
          statusCode: TRAINING_STATUS.TRAINING_WAITING,
        },
        data: {
          statusCode: TRAINING_STATUS.TRAINING_RESCHEDULE,
          trainingId: null, // Reset training so they can pick again
          lockedReason: `System Auto-Absent: Training '${training.title}' (${training.batch}) ended more than 24h ago without attendance record.`,
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Marked ${result.count} users as RESCHEDULE (Absent) for expired training: ${training.title} (${training.batch})`,
        );
        totalUpdated += result.count;
      }
    }

    this.logger.log(`Automated check complete. Total users processed: ${totalUpdated}`);
  }
}
