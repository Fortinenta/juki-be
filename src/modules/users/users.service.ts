import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User, UserRole } from '@prisma/client';
import { UpdateUserDto, QueryUsersDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryUsersDto): Promise<Partial<User>[]> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    return this.prisma.user.findMany({
      skip,
      take: limit,
      where: {
        status: query.status, // Filter by UserStatus if provided
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
        trainingFlow: true,
      },
    });
  }

  async getStats(): Promise<{ total: number }> {
    return { total: await this.prisma.user.count() };
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
        trainingFlow: {
          include: {
            ojsAccount: true,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<Partial<User>> {
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        // Manual map dto ke data (untuk fix assignable)
        email: dto.email,
        role: dto.role as UserRole,
        status: dto.status,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        // profile: true, // Optional: include if needed
      },
    });
    return updatedUser;
  }

  async delete(id: string): Promise<{ message: string }> {
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Deleted' };
  }
}
