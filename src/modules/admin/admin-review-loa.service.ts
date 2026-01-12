import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrainingFlowService } from '../training-flow/training-flow.service';
import { TRAINING_STATUS } from '../../common/constants/training-status.constants';
import { AttachmentType } from '@prisma/client';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

@Injectable()
export class AdminReviewLoaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trainingFlowService: TrainingFlowService,
  ) {}

  async acceptReview(userId: string, adminId: string, comment?: string) {
    const flow = await this.prisma.userTrainingFlow.findUnique({
      where: { userId },
    });

    const allowedStatuses = [
      TRAINING_STATUS.TRAINING_VERIFIED,
      TRAINING_STATUS.REVIEW_WAITING,
    ];

    if (!flow || !allowedStatuses.includes(flow.statusCode as any)) {
      throw new BadRequestException('Invalid flow state for accepting review');
    }

    await this.trainingFlowService.transitionStatus({
      userId,
      nextStatus: TRAINING_STATUS.REVIEW_VERIFIED,
      actorId: adminId,
      metadata: { comment },
    });

    await this.trainingFlowService.transitionStatus({
      userId,
      nextStatus: TRAINING_STATUS.LOA_WAITING,
      actorId: adminId, // Use adminId instead of 'SYSTEM' to ensure valid user FK
    });

    return { message: 'Review accepted, waiting for LOA' };
  }

  async revisionReview(userId: string, adminId: string, comment?: string) {
    const flow = await this.prisma.userTrainingFlow.findUnique({
      where: { userId },
    });

    const allowedStatuses = [
      TRAINING_STATUS.TRAINING_VERIFIED,
      TRAINING_STATUS.REVIEW_WAITING,
    ];

    if (!flow || !allowedStatuses.includes(flow.statusCode as any)) {
      throw new BadRequestException('Invalid flow state for revision request');
    }

    await this.trainingFlowService.transitionStatus({
      userId,
      nextStatus: TRAINING_STATUS.REVIEW_REVISION,
      actorId: adminId,
      metadata: { comment },
    });

    return { message: 'Review marked as revision' };
  }

  async uploadLoa(userId: string, adminId: string, file: Express.Multer.File) {
    try {
      if (!file) throw new BadRequestException('LOA file required');

      console.log(`[AdminReviewLoa] Starting LOA upload for user ${userId} by admin ${adminId}`);

      // Verify Admin exists to avoid P2003 in audit log
      const adminExists = await this.prisma.user.findUnique({ where: { id: adminId } });
      if (!adminExists) {
        throw new BadRequestException('Admin account not found in database. Please re-login.');
      }

      const flow = await this.prisma.userTrainingFlow.findUnique({
        where: { userId },
      });

      if (!flow) {
        throw new BadRequestException('User training flow not found.');
      }

      // Allow upload if status is LOA_WAITING OR LOA_PUBLISHED (for re-upload)
      const isReupload = flow.statusCode === TRAINING_STATUS.LOA_PUBLISHED;
      const isValidState = flow.statusCode === TRAINING_STATUS.LOA_WAITING || isReupload;

      if (!isValidState) {
        throw new BadRequestException(`Invalid State: ${flow.statusCode}. Expected: ${TRAINING_STATUS.LOA_WAITING} or ${TRAINING_STATUS.LOA_PUBLISHED}`);
      }

      // Normalize path for Windows compatibility
      const normalizePath = (p: string) => p.replace(/\\/g, '/');
      
      const attachmentPath = normalizePath(file.path);
      console.log(`[AdminReviewLoa] Saving ${isReupload ? 'NEW ' : ''}attachment to DB: ${attachmentPath}`);

      // Delete existing LOA records and physical files for this user
      const existingLoas = await this.prisma.attachment.findMany({
        where: { userId, type: AttachmentType.LOA },
      });

      for (const loa of existingLoas) {
        try {
          if (existsSync(loa.filePath)) {
            await unlink(loa.filePath);
            console.log(`[AdminReviewLoa] Deleted old LOA file: ${loa.filePath}`);
          }
        } catch (err) {
          console.warn(`[AdminReviewLoa] Failed to delete old file at ${loa.filePath}:`, err.message);
        }
      }

      if (existingLoas.length > 0) {
        await this.prisma.attachment.deleteMany({
          where: { userId, type: AttachmentType.LOA },
        });
        console.log(`[AdminReviewLoa] Removed ${existingLoas.length} old LOA record(s) from DB`);
      }

      await this.prisma.attachment.create({
        data: {
          userId,
          type: AttachmentType.LOA,
          filePath: attachmentPath,
          mimeType: file.mimetype,
          originalName: file.originalname,
          size: file.size,
        },
      });

      // Only transition status if we are not already in LOA_PUBLISHED
      if (!isReupload) {
        console.log('[AdminReviewLoa] Transitioning flow status to LOA_PUBLISHED');
        await this.trainingFlowService.transitionStatus({
          userId,
          nextStatus: TRAINING_STATUS.LOA_PUBLISHED,
          actorId: adminId,
          metadata: { action: 'UPLOAD_LOA', fileName: file.originalname },
        });
      } else {
        console.log('[AdminReviewLoa] User already in LOA_PUBLISHED, skipping status transition.');
        // Log the re-upload action in audit log manually if needed
      }

      console.log('[AdminReviewLoa] LOA upload completed successfully');
      return { message: 'LOA issued successfully' };
    } catch (error) {
      console.error('[AdminReviewLoa] CRITICAL ERROR:', error);
      
      if (error instanceof BadRequestException || error.status) {
         throw error;
      }
      
      throw new BadRequestException(`Upload failed: ${error.message || 'Unknown server error'}`);
    }
  }
}
