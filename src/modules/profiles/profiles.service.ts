import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/profiles.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  async update(
    userId: string,
    dto: UpdateProfileDto,
    currentUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Users can only update their own profile
    if (userId !== currentUserId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const updatedProfile = await this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.profile.update({
        where: { userId },
        data: {
          ...dto,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              status: true,
            },
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'UPDATE_PROFILE',
          metadata: { fields: Object.keys(dto) },
          ipAddress,
          userAgent,
        },
      });

      return updated;
    });

    return updatedProfile;
  }

  async uploadAvatar(userId: string, avatarUrl: string, currentUserId: string) {
    if (userId !== currentUserId) {
      throw new ForbiddenException('You can only update your own avatar');
    }

    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const updatedProfile = await this.prisma.profile.update({
      where: { userId },
      data: { avatar: avatarUrl },
    });

    return updatedProfile;
  }

  async deleteAvatar(userId: string, currentUserId: string) {
    if (userId !== currentUserId) {
      throw new ForbiddenException('You can only delete your own avatar');
    }

    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const updatedProfile = await this.prisma.profile.update({
      where: { userId },
      data: { avatar: null },
    });

    return updatedProfile;
  }
}
