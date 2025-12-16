import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaClient) {}

  async getByUserId(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  async updateProfile(
    userId: string,
    data: {
      fullName?: string;
      phone?: string;
      avatarUrl?: string;
    },
  ) {
    await this.ensureProfileExists(userId);

    return this.prisma.profile.update({
      where: { userId },
      data,
    });
  }

  async createProfile(
    userId: string,
    data: {
      fullName: string;
      phone?: string;
      avatarUrl?: string;
    },
  ) {
    return this.prisma.profile.create({
      data: {
        userId,
        ...data,
      },
    });
  }

  private async ensureProfileExists(userId: string): Promise<void> {
    const exists = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Profile not found');
    }
  }
}
