import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction, UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /* =========================
   * REGISTER
   * ========================= */
  async register(data: {
    email: string;
    password: string;
    fullName: string;
    nim: string;
    phone: string;
    birthPlace: string;
    birthDate: Date;
    gender: string;
  }) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        role: UserRole.USER,
        profile: {
          create: {
            fullName: data.fullName,
            nim: data.nim,
            phone: data.phone,
            birthPlace: data.birthPlace,
            birthDate: data.birthDate,
            gender: data.gender,
          },
        },
      },
    });

    // 🔥 INI PENTING (FLOW WAJIB DIBUAT SAAT REGISTER)
    await this.prisma.userTrainingFlow.create({
      data: {
        userId: user.id,
        statusCode: 'PAYMENT_REQUIRED',
        isLocked: false,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.REGISTER,
      },
    });

    return {
      message: 'Registration successful',
    };
  }

  /* =========================
   * LOGIN
   * ========================= */
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.LOGIN,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /* =========================
   * LOGOUT
   * ========================= */
  async logout(userId: string, refreshToken: string) {
    await this.prisma.session.deleteMany({
      where: {
        userId,
        refreshToken,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.LOGOUT,
      },
    });

    return {
      message: 'Logout successful',
    };
  }

  /* =========================
   * ME
   * ========================= */
  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        trainingFlow: true,
      },
    });
  }
}
