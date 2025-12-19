import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserTrainingFlow } from '@prisma/client';
import { AuditAction } from '@prisma/client';
import { TRAINING_FLOW_TRANSITIONS } from './training-flow.transitions';

@Injectable()
export class TrainingFlowService {
  constructor(private prisma: PrismaService) {}

  async getFlow(userId: string): Promise<UserTrainingFlow | null> {
    return this.prisma.userTrainingFlow.findUnique({
      where: { userId }, // Sekarang valid, userId adalah PK
    });
  }

  // async transitionStatus(userId: string, newStatus: string): Promise<UserTrainingFlow> {
  //   const flow = await this.getFlow(userId);
  //   if (!flow) throw new Error('Flow not found');
  //   // Validasi urutan status di sini (state machine logic)
  //   return this.prisma.userTrainingFlow.update({
  //     where: { userId },
  //     data: { statusCode: newStatus },
  //   });
  // }

  async getFlowByUserId(userId: string) {
    const flow = await this.prisma.userTrainingFlow.findUnique({
      where: { userId },
    });

    if (!flow) {
      throw new BadRequestException('User does not have training flow');
    }

    return flow;
  }

  validateTransition(currentStatus: string, nextStatus: string) {
    const allowedNext = TRAINING_FLOW_TRANSITIONS[currentStatus] || [];

    if (!allowedNext.includes(nextStatus)) {
      throw new ForbiddenException(
        `Transition from ${currentStatus} to ${nextStatus} is not allowed`,
      );
    }
  }

  async transitionStatus(params: {
    userId: string;
    nextStatus: string;
    actorId: string;
    metadata?: Record<string, any>;
  }) {
    const { userId, nextStatus, actorId, metadata } = params;

    return this.prisma.$transaction(async (tx) => {
      const flow = await tx.userTrainingFlow.findUnique({
        where: { userId },
      });

      if (!flow) {
        throw new BadRequestException('Training flow not found');
      }

      if (flow.isLocked) {
        throw new ForbiddenException('Training flow is locked');
      }

      this.validateTransition(flow.statusCode, nextStatus);

      const updated = await tx.userTrainingFlow.update({
        where: { userId },
        data: { statusCode: nextStatus },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: AuditAction.UPDATE_PROFILE,
          metadata: {
            from: flow.statusCode,
            to: nextStatus,
            ...metadata,
          },
        },
      });

      return updated;
    });
  }

  async lockFlow(userId: string, reason: string) {
    return this.prisma.userTrainingFlow.update({
      where: { userId },
      data: {
        isLocked: true,
        lockedReason: reason,
      },
    });
  }

  // Tambah method lain dari roadmap, misal checkAllowedTransition
}
