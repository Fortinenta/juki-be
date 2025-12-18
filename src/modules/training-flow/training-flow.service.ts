import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TRAINING_FLOW_TRANSITIONS } from './training-flow.transitions';

@Injectable()
export class TrainingFlowService {
  constructor(private readonly prisma: PrismaService) {}

  async transitionStatus(userId: string, nextStatus: string) {
    const flow = await this.prisma.userTrainingFlow.findUnique({
      where: { userId },
    });

    if (!flow) {
      throw new NotFoundException('Training flow not found');
    }

    const allowedNext = TRAINING_FLOW_TRANSITIONS[flow.statusCode] || [];

    if (!allowedNext.includes(nextStatus)) {
      throw new BadRequestException(`Invalid transition from ${flow.statusCode} to ${nextStatus}`);
    }

    return this.prisma.userTrainingFlow.update({
      where: { userId },
      data: {
        statusCode: nextStatus,
        updatedAt: new Date(),
      },
    });
  }
}
