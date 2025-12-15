import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import ms from 'ms';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto, RefreshTokenDto, ChangePasswordDto } from './dto/auth.dto';
import { AuthResponse, AuthTokens } from './entities/auth.entity';

interface JwtPayload {
  sub: string; // userId
  email: string;
  role: string;
}

/**
 * Catatan Perbaikan:
 * - Refresh token sekarang di-HASH (security fix)
 * - Expiry token pakai `ms()` (aman untuk 7d / 1h / 30m)
 * - Error handling lebih jelas
 * - Tidak ada perubahan kontrak API (aman untuk frontend)
 */

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /* =========================
   * REGISTER
   * ========================= */
  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(
      dto.password,
      this.configService.get<number>('BCRYPT_ROUNDS', 10),
    );

    const user = await this.prisma.$transaction(async (prisma) => {
      const createdUser = await prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          profile: {
            create: {
              firstName: dto.firstName,
              lastName: dto.lastName,
            },
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: createdUser.id,
          action: 'REGISTER',
          ipAddress,
          userAgent,
        },
      });

      return createdUser;
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken, ipAddress, userAgent);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      tokens,
    };
  }

  /* =========================
   * LOGIN
   * ========================= */
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    await this.prisma.$transaction(async (prisma) => {
      await this.saveRefreshToken(user.id, tokens.refreshToken, ipAddress, userAgent);

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          ipAddress,
          userAgent,
        },
      });
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      tokens,
    };
  }

  /* =========================
   * REFRESH TOKEN (FIXED)
   * ========================= */
  async refreshToken(
    dto: RefreshTokenDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens> {
    try {
      this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const sessions = await this.prisma.session.findMany({
        where: { user: { status: 'ACTIVE' } },
        include: { user: true },
      });

      const session = sessions.find((s) => bcrypt.compareSync(dto.refreshToken, s.refreshToken));

      if (!session) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (new Date() > session.expiresAt) {
        await this.prisma.session.delete({ where: { id: session.id } });
        throw new UnauthorizedException('Refresh token expired');
      }

      const tokens = await this.generateTokens(
        session.user.id,
        session.user.email,
        session.user.role,
      );

      await this.prisma.$transaction(async (prisma) => {
        await prisma.session.update({
          where: { id: session.id },
          data: {
            refreshToken: await bcrypt.hash(tokens.refreshToken, 10),
            expiresAt: this.calculateRefreshTokenExpiry(),
            ipAddress,
            userAgent,
          },
        });

        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: 'REFRESH_TOKEN',
            ipAddress,
            userAgent,
          },
        });
      });

      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /* =========================
   * LOGOUT
   * ========================= */
  async logout(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
    });

    const session = sessions.find((s) => bcrypt.compareSync(refreshToken, s.refreshToken));

    if (!session) return;

    await this.prisma.$transaction(async (prisma) => {
      await prisma.session.delete({ where: { id: session.id } });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'LOGOUT',
          ipAddress,
          userAgent,
        },
      });
    });
  }

  /* =========================
   * CHANGE PASSWORD
   * ========================= */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(
      dto.newPassword,
      this.configService.get<number>('BCRYPT_ROUNDS', 10),
    );

    await this.prisma.$transaction(async (prisma) => {
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      await prisma.session.deleteMany({ where: { userId } });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'UPDATE_PASSWORD',
          ipAddress,
          userAgent,
        },
      });
    });
  }

  /* =========================
   * INTERNAL HELPERS
   * ========================= */
  private async generateTokens(userId: string, email: string, role: string): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>('jwt.accessExpiresIn'),
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
    });

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.prisma.session.create({
      data: {
        userId,
        refreshToken: await bcrypt.hash(refreshToken, 10),
        expiresAt: this.calculateRefreshTokenExpiry(),
        ipAddress,
        userAgent,
      },
    });
  }

  private calculateRefreshTokenExpiry(): Date {
    const expiresIn = this.configService.get<string>('jwt.refreshExpiresIn', '7d');
    return new Date(Date.now() + ms(expiresIn));
  }
}
