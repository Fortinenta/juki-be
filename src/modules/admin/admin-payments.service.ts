import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrainingFlowService } from '../training-flow/training-flow.service';
import { TRAINING_STATUS } from '../../common/constants/training-status.constants';
import { PaymentVerifyAction, VerifyPaymentDto } from './dto/admin-payments.dto';

@Injectable()
export class AdminPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trainingFlowService: TrainingFlowService,
  ) {}

  async verifyPayment(userId: string, dto: VerifyPaymentDto, adminId: string) {
    const payment = await this.prisma.attachment.findFirst({
      where: {
        userId,
        type: 'PAYMENT',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      throw new BadRequestException('Payment proof not found');
    }

    if (dto.action === PaymentVerifyAction.REJECT) {
      if (!dto.reason) {
        throw new BadRequestException('Reason is required for rejection');
      }

      await this.trainingFlowService.transitionStatus({
        userId,
        nextStatus: TRAINING_STATUS.PAYMENT_REQUIRED,
        actorId: adminId,
        metadata: {
          action: 'REJECT_PAYMENT',
          paymentId: payment.id,
          reason: dto.reason,
        },
      });

      await this.prisma.userTrainingFlow.update({
        where: { userId },
        data: { rejectionReason: dto.reason },
      });

      return { message: 'Payment rejected. User required to re-upload.' };
    }

    // Default: ACCEPT
    await this.trainingFlowService.transitionStatus({
      userId,
      nextStatus: TRAINING_STATUS.PAYMENT_VERIFIED,
      actorId: adminId,
      metadata: {
        action: 'VERIFY_PAYMENT',
        paymentId: payment.id,
      },
    });

    await this.prisma.userTrainingFlow.update({
      where: { userId },
      data: { rejectionReason: null },
    });

    return {
      message: 'Payment verified successfully',
    };
  }
}
