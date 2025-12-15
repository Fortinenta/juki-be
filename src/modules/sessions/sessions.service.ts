import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUserId(userId: string, currentUserId: string) {
    // Users can only view their own sessions
    if (userId !== currentUserId) {
      throw new ForbiddenException('You can only view your own sessions');
    }

    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: {
          gte: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return sessions;
  }

  async revokeSession(sessionId: string, userId: string, currentUserId: string) {
    // Users can only revoke their own sessions
    if (userId !== currentUserId) {
      throw new ForbiddenException('You can only revoke your own sessions');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('This session does not belong to you');
    }

    await this.prisma.$transaction(async (prisma) => {
      await prisma.session.delete({
        where: { id: sessionId },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'REVOKE_TOKEN',
          metadata: { sessionId },
        },
      });
    });

    return { message: 'Session revoked successfully' };
  }

  async revokeAllSessions(userId: string, currentUserId: string) {
    // Users can only revoke their own sessions
    if (userId !== currentUserId) {
      throw new ForbiddenException('You can only revoke your own sessions');
    }

    const deletedCount = await this.prisma.$transaction(async (prisma) => {
      const result = await prisma.session.deleteMany({
        where: { userId },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'REVOKE_TOKEN',
          metadata: { action: 'revoke_all', count: result.count },
        },
      });

      return result.count;
    });

    return {
      message: 'All sessions revoked successfully',
      count: deletedCount,
    };
  }

  async cleanupExpiredSessions() {
    const result = await this.prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return {
      message: 'Expired sessions cleaned up',
      count: result.count,
    };
  }
}
