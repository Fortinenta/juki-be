import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User, UserRole, UserStatus } from '@prisma/client';
import { UpdateUserDto, QueryUsersDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryUsersDto, currentUserRoles: string[] = []) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (query.status) {
      if (Object.values(UserStatus).includes(query.status as UserStatus)) {
        whereClause.status = query.status;
      } else {
        whereClause.trainingFlow = {
          statusCode: query.status,
        };
      }
    }

    if (query.search) {
      whereClause.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { profile: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { profile: { nim: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    // Logic filter berdasarkan role yang request
    const isSuperAdmin = currentUserRoles.includes('SUPER_ADMIN');
    const isAdmin = currentUserRoles.includes('ADMIN');

    if (!isSuperAdmin && isAdmin) {
      whereClause.role = 'USER';
    } else if (isSuperAdmin) {
      if (query.role) {
        whereClause.role = query.role;
      }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take: limit,
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          profile: true,
          attachments: true,
          trainingFlow: {
            include: {
              status: true,
              ojsAccount: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getStats() {
    const [
      totalUsers,
      totalParticipants,
      totalAdmins,
      totalSuperAdmins,
      paymentVerificationNeeded,
      administrativeVerificationNeeded,
      inArticleProcess,
      loaPublished,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'USER' } }),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.user.count({ where: { role: 'SUPER_ADMIN' } }),
      this.prisma.user.count({
        where: {
          role: 'USER',
          trainingFlow: { statusCode: 'PAYMENT_WAITING' },
        },
      }),
      this.prisma.user.count({
        where: {
          role: 'USER',
          trainingFlow: { statusCode: 'WAITING_ADMINISTRATIVE' },
        },
      }),
      this.prisma.user.count({
        where: {
          role: 'USER',
          trainingFlow: {
            statusCode: {
              in: [
                'ARTICLE_WAITING',
                'ARTICLE_VERIFIED',
                'TRAINING_WAITING',
                'TRAINING_VERIFIED',
                'TRAINING_RESCHEDULE',
                'REVIEW_WAITING',
                'REVIEW_VERIFIED',
                'REVIEW_REVISION',
                'LOA_WAITING',
                'LOA_PUBLISHED',
              ],
            },
          },
        },
      }),
      this.prisma.user.count({
        where: {
          role: 'USER',
          trainingFlow: { statusCode: 'LOA_PUBLISHED' },
        },
      }),
    ]);

    return {
      total: totalUsers,
      roles: {
        user: totalParticipants,
        admin: totalAdmins,
        super_admin: totalSuperAdmins,
      },
      needs_verification: {
        payment: paymentVerificationNeeded,
        administrative: administrativeVerificationNeeded,
      },
      process: {
        article_stage: inArticleProcess,
        loa_published: loaPublished,
      },
    };
  }

  async findOne(id: string): Promise<Partial<User> | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
        attachments: true,
        trainingFlow: {
          include: {
            status: true,
            ojsAccount: true,
            training: true,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<Partial<User>> {
    const { email, role, status, ...profileData } = dto;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        email,
        role,
        status,
        profile: Object.keys(profileData).length > 0 ? {
          update: {
            ...profileData,
            birthDate: profileData.birthDate ? new Date(profileData.birthDate) : undefined,
          }
        } : undefined,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
      },
    });
    return updatedUser;
  }

  async delete(id: string): Promise<{ message: string }> {
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Deleted' };
  }
}
