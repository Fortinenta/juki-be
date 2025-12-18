import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async uploadPaymentProof(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new ForbiddenException('File is required');
    }

    // 1. Simpan attachment
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

    // 2. Update flow status
    await this.prisma.userTrainingFlow.update({
      where: { userId },
      data: {
        statusCode: 'PAYMENT_WAITING',
      },
    });

    return {
      message: 'Payment proof uploaded, waiting for verification',
    };
  }
}
