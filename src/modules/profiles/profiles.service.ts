import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/profiles.dto';
import { Profile } from '@prisma/client';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getByUserId(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            trainingFlow: {
              include: {
                ojsAccount: true,
              },
            },
          },
        },
      },
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

  async create(userId: string, data: UpdateProfileDto): Promise<Profile> {
    return this.prisma.profile.create({
      data: {
        userId,
        fullName: data.fullName || '',
        nim: data.nim || '',
        phone: data.phoneNumber || '',
        birthPlace: data.birthPlace || '',
        birthDate: data.dateOfBirth || '',
        gender: data.gender || '',
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
