import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto, QueryUsersDto } from './dto/users.dto';
import { Prisma, UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUsersDto) {
    const { search, role, status, page = 1, limit = 10 } = query;

    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { profile: { firstName: { contains: search, mode: 'insensitive' } } },
        { profile: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        include: {
          profile: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Remove password from response
    const sanitizedUsers = users.map((user) => {
      const userWithoutPassword = { ...user };
      delete (userWithoutPassword as any).password;
      return userWithoutPassword;
    });

    return {
      data: sanitizedUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userWithoutPassword = { ...user };
    delete (userWithoutPassword as any).password;
    return userWithoutPassword;
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userWithoutPassword = { ...user };
    delete (userWithoutPassword as any).password;
    return userWithoutPassword;
  }

  async update(id: string, dto: UpdateUserDto, currentUserId: string, currentUserRole: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only admins or the user themselves can update
    if (currentUserId !== id && currentUserRole !== 'ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('You do not have permission to update this user');
    }

    // Only super admin can change roles
    if (dto.role && currentUserRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admins can change user roles');
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (dto.email !== undefined) {
      updateData.email = dto.email;
    }
    if (dto.role !== undefined) {
      updateData.role = dto.role as UserRole;
    }
    if (dto.status !== undefined) {
      updateData.status = dto.status as UserStatus;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        profile: true,
      },
    });

    const userWithoutPassword = { ...updatedUser };
    delete (userWithoutPassword as any).password;
    return userWithoutPassword;
  }

  async delete(id: string, currentUserId: string, currentUserRole: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Users cannot delete themselves
    if (currentUserId === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    // Only admins can delete users
    if (currentUserRole !== 'ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('You do not have permission to delete users');
    }

    // Soft delete by updating status
    await this.prisma.user.update({
      where: { id },
      data: {
        status: 'DELETED',
      },
    });

    return { message: 'User deleted successfully' };
  }

  async getStats() {
    const [totalUsers, activeUsers, suspendedUsers, deletedUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.user.count({ where: { status: 'DELETED' } }),
    ]);

    return {
      total: totalUsers,
      active: activeUsers,
      suspended: suspendedUsers,
      deleted: deletedUsers,
    };
  }
}
