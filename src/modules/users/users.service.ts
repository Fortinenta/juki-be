import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User, UserRole } from '@prisma/client';
import { UpdateUserDto, QueryUsersDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryUsersDto, currentUserRoles: string[] = []): Promise<Partial<User>[]> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      status: query.status,
    };

    // Logic filter berdasarkan role yang request
    const isSuperAdmin = currentUserRoles.includes('SUPER_ADMIN');
    const isAdmin = currentUserRoles.includes('ADMIN');

    if (!isSuperAdmin && isAdmin) {
      // Jika ADMIN biasa, hanya boleh lihat USER
      whereClause.role = 'USER';
    } else if (isSuperAdmin) {
      // Jika SUPER_ADMIN, boleh lihat semua, atau filter spesifik dari query params
      if (query.role) {
        whereClause.role = query.role;
      }
    }
    // Jika user biasa (seharusnya ditahan guard), tapi untuk safety net
    else if (!isAdmin && !isSuperAdmin) {
       // Return kosong atau throw forbidden, tapi karena di controller sudah ada RolesGuard, 
       // kode ini mungkin unreachable kecuali guard diubah.
       whereClause.role = 'NONE'; // Hack biar result kosong
    }

    return this.prisma.user.findMany({
      skip,
      take: limit,
      where: whereClause,
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
            status: true,
            ojsAccount: true,
          },
        },
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
