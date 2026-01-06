import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Attachment } from '@prisma/client';

@Injectable()
export class AttachmentsService {
  constructor(private prisma: PrismaService) {}

  async findAllMyAttachments(userId: string): Promise<Attachment[]> {
    return this.prisma.attachment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForDownload(id: string, userId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Security check: ensure user owns the attachment (or admin, but for this endpoint we assume user context)
    // If you want admins to download user files, we might need a separate endpoint or pass roles here.
    if (attachment.userId !== userId) {
        // Optional: Check if role is admin logic here if reusing service
        throw new ForbiddenException('You do not have permission to access this file');
    }

    return {
        path: attachment.filePath,
        filename: attachment.originalName || `file-${attachment.id}`,
        mimeType: attachment.mimeType
    };
  }
  
  // Method khusus untuk admin download file user
  async findOneForAdminDownload(id: string) {
      const attachment = await this.prisma.attachment.findUnique({
        where: { id },
      });
  
      if (!attachment) {
        throw new NotFoundException('Attachment not found');
      }
  
      return {
          path: attachment.filePath,
          filename: attachment.originalName || `file-${attachment.id}`,
          mimeType: attachment.mimeType
      };
    }
}
