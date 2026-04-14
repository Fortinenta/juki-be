import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User, UserStatus } from '@prisma/client';
import { UpdateUserDto, QueryUsersDto } from './dto/users.dto';
import { AdminResetPasswordDto } from './dto/reset-password.dto';
import { WhatsAppService } from '../notifications/whatsapp.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsAppService,
  ) {}

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
                'ADMINISTRATIVE_REQUIRED',
                'ADMINISTRATIVE_REJECTED',
                'WAITING_ADMINISTRATIVE',
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
    const {
      email,
      password,
      role,
      status,
      articleTitle,
      journalCode,
      ojsUsername,
      ojsPassword,
      ojsJournalLink,
      ...profileData
    } = dto;

    // 1. Update User basic info
    const userUpdate: any = {};
    if (email !== undefined) userUpdate.email = email;
    if (role !== undefined) userUpdate.role = role;
    if (status !== undefined) userUpdate.status = status;

    // Hash password if provided (admin reset password)
    if (password !== undefined) {
      userUpdate.password = await bcrypt.hash(password, 10);
    }

    // 2. Update Profile if there's profile data
    if (Object.keys(profileData).length > 0) {
      userUpdate.profile = {
        update: {
          ...profileData,
          birthDate: profileData.birthDate ? new Date(profileData.birthDate) : undefined,
        },
      };
    }

    // Execute user update
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: userUpdate,
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

    // 3. Update Training Flow (articleTitle, journalCode) if provided
    const flowUpdate: any = {};
    if (articleTitle !== undefined) flowUpdate.articleTitle = articleTitle;
    if (journalCode !== undefined) flowUpdate.journalCode = journalCode;

    if (Object.keys(flowUpdate).length > 0) {
      await this.prisma.userTrainingFlow.update({
        where: { userId: id },
        data: flowUpdate,
      });
    }

    // 4. Update or Create OJS Account if provided
    if (ojsUsername !== undefined || ojsPassword !== undefined || ojsJournalLink !== undefined) {
      // Get current flow to check if OJS account exists
      const flow = await this.prisma.userTrainingFlow.findUnique({
        where: { userId: id },
        select: { ojsAccountId: true, journalCode: true },
      });

      const ojsData: any = {};
      if (ojsUsername !== undefined) ojsData.username = ojsUsername;
      if (ojsPassword !== undefined) ojsData.password = ojsPassword;
      if (ojsJournalLink !== undefined) ojsData.journalLink = ojsJournalLink;
      // Use journalCode from flow or from dto
      ojsData.journalCode = journalCode || flow?.journalCode || 'JIE';

      if (flow?.ojsAccountId) {
        // Update existing OJS account
        await this.prisma.ojsAccount.update({
          where: { id: flow.ojsAccountId },
          data: ojsData,
        });
      } else {
        // Create new OJS account
        const newOjs = await this.prisma.ojsAccount.create({
          data: ojsData,
        });

        // Link to user training flow
        await this.prisma.userTrainingFlow.update({
          where: { userId: id },
          data: { ojsAccountId: newOjs.id },
        });
      }
    }

    // 5. If password was changed, revoke all sessions (force re-login)
    if (password !== undefined) {
      await this.prisma.session.deleteMany({
        where: { userId: id },
      });
    }

    return updatedUser;
  }

  async delete(id: string): Promise<{ message: string }> {
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Deleted' };
  }

  /**
   * Generate random password
   */
  private generateRandomPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length];
    }

    return password;
  }

  /**
   * Admin reset user password
   * Generate password and return message for manual WhatsApp send
   */
  async resetPassword(userId: string, dto: AdminResetPasswordDto, adminId: string) {
    const autoGenerate = dto.autoGenerate !== false; // Default: true

    // Get user data
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate or use provided password
    const newPassword = autoGenerate ? this.generateRandomPassword(12) : dto.newPassword;

    if (!newPassword) {
      throw new Error('Password is required');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and revoke sessions
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      // Revoke all sessions
      await tx.session.deleteMany({
        where: { userId },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'UPDATE',
          metadata: {
            action: 'ADMIN_RESET_PASSWORD',
            targetUserId: userId,
            targetUserEmail: user.email,
            autoGenerated: autoGenerate,
          },
        },
      });
    });

    // Generate WhatsApp message template
    const whatsappMessage = `Halo ${user.profile?.fullName || user.email},

Password akun JUKI Anda telah direset oleh admin.

Password baru Anda:
${newPassword}

Silakan login menggunakan password baru ini di:
http://juki-hub.rurustudio.cloud/

Untuk keamanan, segera ganti password Anda setelah login.

Terima kasih,
Tim JUKI`;

    return {
      success: true,
      message: 'Password reset successfully',
      data: {
        userId: user.id,
        email: user.email,
        fullName: user.profile?.fullName,
        phone: user.profile?.phone,
        newPassword: newPassword,
        whatsappMessage: whatsappMessage,
      },
      instruction: 'Silakan copy pesan WhatsApp di bawah dan kirim manual ke nomor peserta',
    };
  }
}
