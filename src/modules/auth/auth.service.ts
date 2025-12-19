import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/auth.dto';
import { AuditAction, UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const accessToken = this.jwtService.sign({ userId: user.id, role: user.role });
    const refreshToken = this.jwtService.sign({ userId: user.id }, { expiresIn: '7d' });
    await this.prisma.auditLog.create({
      data: { userId: user.id, action: AuditAction.LOGIN, metadata: { details: 'User logged in' } },
    });
    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        role: UserRole.USER,
      },
    });
    await this.prisma.profile.create({
      data: {
        userId: user.id,
        fullName: dto.fullName,
        nim: dto.nim,
        phone: dto.phone,
        birthPlace: dto.birthPlace,
        birthDate: dto.birthDate,
        gender: dto.gender,
      },
    });
    await this.prisma.userTrainingFlow.create({
      data: { userId: user.id, statusCode: 'PAYMENT_REQUIRED' },
    });
    return { message: 'Registered successfully' };
  }

  async refresh(userId: string, refreshToken: string) {
    this.jwtService.verify(refreshToken);
    const newAccessToken = this.jwtService.sign({ userId });
    return { accessToken: newAccessToken };
  }

  async logout(userId: string) {
    await this.prisma.auditLog.create({
      data: { userId, action: AuditAction.LOGOUT, metadata: { details: 'User logged out' } },
    });
    return { message: 'Logged out' };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
      throw new BadRequestException('Invalid old password');
    }
    const hashedNew = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNew },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: AuditAction.UPDATE, metadata: { details: 'Password changed' } },
    });
    return { message: 'Password changed successfully' };
  }
}
