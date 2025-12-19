import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User, UserRole } from '@prisma/client';
import { UpdateUserDto, QueryUsersDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryUsersDto): Promise<User[]> {
    return this.prisma.user.findMany({ take: query.limit || 10 });
  }

  async getStats(): Promise<{ total: number }> {
    return { total: await this.prisma.user.count() };
  }

  async findOne(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        // Manual map dto ke data (untuk fix assignable)
        email: dto.email,
        role: dto.role as UserRole,
      },
    });
  }

  async delete(id: string): Promise<{ message: string }> {
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Deleted' };
  }
}
