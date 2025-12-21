import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrainingFlowService } from '../training-flow/training-flow.service';
import { TRAINING_STATUS } from '../../common/constants/training-status.constants';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trainingFlowService: TrainingFlowService,
  ) {}

  async uploadPaymentProof(params: { userId: string; file: Express.Multer.File }) {
    const { userId, file } = params;

    if (!file) {
      throw new BadRequestException('Payment proof file is required');
    }

    await this.prisma.attachment.create({
      data: {
        userId,
        type: 'PAYMENT',
        filePath: file.path,
        mimeType: file.mimetype,
        originalName: file.originalname,
        size: file.size,
      },
    });

    await this.trainingFlowService.transitionStatus({
      userId,
      nextStatus: TRAINING_STATUS.PAYMENT_WAITING,
      actorId: userId, // Changed from 'SYSTEM' to userId
      metadata: {
        action: 'UPLOAD_PAYMENT_PROOF',
        filename: file.originalname,
      },
    });

    return {
      message: 'Payment proof uploaded successfully',
    };
  }
}