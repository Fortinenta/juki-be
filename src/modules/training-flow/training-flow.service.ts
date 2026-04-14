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
    console.log(`[Flow] Transitioning user ${userId} to ${nextStatus} by actor ${actorId}`);

    try {
      return await this.prisma.$transaction(async (tx) => {
        console.log('[Flow] Finding user flow...');
        const flow = await tx.userTrainingFlow.findUnique({
          where: { userId },
        });

        if (!flow) {
          console.error('[Flow] Flow not found for user:', userId);
          throw new BadRequestException('Training flow not found');
        }
        console.log(`[Flow] Current status: ${flow.statusCode}`);

        if (flow.isLocked) {
          throw new ForbiddenException('Training flow is locked');
        }

        console.log('[Flow] Validating transition...');
        this.validateTransition(flow.statusCode, nextStatus);

        console.log('[Flow] Updating status...');
        const updated = await tx.userTrainingFlow.update({
          where: { userId },
          data: { statusCode: nextStatus },
        });

        try {
          console.log('[Flow] Attempting to create audit log...');
          await tx.auditLog.create({
            data: {
              userId: actorId,
              action: AuditAction.UPDATE_PROFILE, // Using existing enum
              metadata: {
                from: flow.statusCode,
                to: nextStatus,
                ...metadata,
              },
            },
          });
        } catch (auditError) {
          console.error('[Flow] Non-fatal Audit Log Error:', auditError.message);
          // We don't throw here to allow the status update to persist
        }

        console.log('[Flow] Transaction complete.');
        return updated;
      });
    } catch (error) {
      console.error('[Flow] Transaction failed:', error);
      if (error.code === 'P2003') {
        throw new BadRequestException('Foreign key constraint failed. Check status code or actor existence.');
      }
      throw error;
    }
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
