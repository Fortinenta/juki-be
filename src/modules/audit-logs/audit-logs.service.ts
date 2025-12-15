import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryAuditLogsDto } from './dto/audit-logs.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryAuditLogsDto, currentUserRole: string) {
    // Only admins can view all audit logs
    if (currentUserRole !== 'ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('You do not have permission to view audit logs');
    }

    const { userId, action, startDate, endDate, page = 1, limit = 10 } = query;

    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByUserId(userId: string, currentUserId: string, currentUserRole: string) {
    // Users can only view their own audit logs unless they're admins
    if (
      userId !== currentUserId &&
      currentUserRole !== 'ADMIN' &&
      currentUserRole !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException('You can only view your own audit logs');
    }

    const logs = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to last 100 logs
    });

    return logs;
  }

  async getStats(currentUserRole: string) {
    // Only admins can view stats
    if (currentUserRole !== 'ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('You do not have permission to view audit log stats');
    }

    const [totalLogs, todayLogs, loginCount, registerCount, profileUpdateCount] = await Promise.all(
      [
        this.prisma.auditLog.count(),
        this.prisma.auditLog.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        this.prisma.auditLog.count({
          where: { action: 'LOGIN' },
        }),
        this.prisma.auditLog.count({
          where: { action: 'REGISTER' },
        }),
        this.prisma.auditLog.count({
          where: { action: 'UPDATE_PROFILE' },
        }),
      ],
    );

    return {
      total: totalLogs,
      today: todayLogs,
      byAction: {
        login: loginCount,
        register: registerCount,
        profileUpdate: profileUpdateCount,
      },
    };
  }

  async createLog(
    userId: string,
    action: string,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action: action as any,
        metadata,
        ipAddress,
        userAgent,
      },
    });
  }
}
