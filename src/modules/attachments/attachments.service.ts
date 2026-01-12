import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Attachment, AttachmentType } from '@prisma/client';
import { extname } from 'path';

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
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Security check: ensure user owns the attachment
    if (attachment.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this file');
    }

    let filename = attachment.originalName || `file-${attachment.id}`;

    // Custom wording for LOA: LOA_NIM_Nama
    if (attachment.type === AttachmentType.LOA && attachment.user?.profile) {
      const extension = extname(attachment.filePath) || '.pdf';
      const nim = attachment.user.profile.nim || 'NO_NIM';
      const safeName = attachment.user.profile.fullName.replace(/\s+/g, '_');
      filename = `LOA_${nim}_${safeName}${extension}`;
    }

    return {
      path: attachment.filePath,
      filename,
      mimeType: attachment.mimeType,
    };
  }

  async findOneForAdminDownload(id: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    let filename = attachment.originalName || `file-${attachment.id}`;

    // Custom wording for LOA: LOA_NIM_Nama
    if (attachment.type === AttachmentType.LOA && attachment.user?.profile) {
      const extension = extname(attachment.filePath) || '.pdf';
      const nim = attachment.user.profile.nim || 'NO_NIM';
      const safeName = attachment.user.profile.fullName.replace(/\s+/g, '_');
      filename = `LOA_${nim}_${safeName}${extension}`;
    }

    return {
      path: attachment.filePath,
      filename,
      mimeType: attachment.mimeType,
    };
  }
}