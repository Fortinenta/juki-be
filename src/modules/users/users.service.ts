import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        profile: {
          select: {
            fullName: true,
            phone: true,
            avatarUrl: true,
          },
        },
        roles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        profile: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async deactivate(userId: string) {
    await this.ensureUserExists(userId);

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  async activate(userId: string) {
    await this.ensureUserExists(userId);

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const exists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('User not found');
    }
  }
}
