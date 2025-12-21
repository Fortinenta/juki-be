/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditLog, AuditAction } from '@prisma/client';
import { QueryAuditLogsDto } from './dto/audit-logs.dto';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryAuditLogsDto, _currentUserRoles: string[]): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      take: query.limit || 10,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats(_currentUserRoles: string[]): Promise<{
    total: number;
    byAction: Array<{ action: AuditAction; _count: number }>;
  }> {
    const total = await this.prisma.auditLog.count();
    const byAction = await this.prisma.auditLog.groupBy({
      by: ['action'],
      _count: { action: true },
    });

    return {
      total,
      byAction: byAction.map((item) => ({
        action: item.action,
        _count: item._count.action,
      })),
    };
  }

  async findByUserId(userId: string, currentUserId: string, roles: string[]): Promise<AuditLog[]> {
    const isAdmin = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
    
    if (!isAdmin && userId !== currentUserId) {
      throw new ForbiddenException('Unauthorized access to audit logs');
    }
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLog(userId: string, action: AuditAction, details: string): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: { userId, action, metadata: { details } },
    });
  }
}