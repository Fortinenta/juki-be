import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/auth.dto';
import { AuditAction, UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(email: string, password: string, ipAddress: string, userAgent: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, roles: [user.role] };
    const accessToken = this.jwtService.sign(payload);
    
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const refreshToken = this.jwtService.sign(
      { sub: user.id, email: user.email }, 
      { secret: refreshSecret, expiresIn: '7d' }
    );

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    
    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: hashedRefreshToken,
        userAgent: userAgent,
        ipAddress: ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.auditLog.create({
      data: { userId: user.id, action: AuditAction.LOGIN, metadata: { details: 'User logged in' } },
    });

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          role: UserRole.USER,
          status: 'ACTIVE',
        },
      });
      
      // birthDate is string from DTO, ensure it's ISO compatible for Prisma DateTime
      // If DTO validation passed IsDateString, it should be fine.
      
      await tx.profile.create({
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
      
      await tx.userTrainingFlow.create({
        data: { userId: user.id, statusCode: 'PAYMENT_REQUIRED' },
      });
      
      return { message: 'Registered successfully' };
    });
  }

  async refresh(userId: string, refreshToken: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
    });

    let validSession = null;
    for (const session of sessions) {
      if (await bcrypt.compare(refreshToken, session.refreshToken)) {
        validSession = session;
        break;
      }
    }

    if (!validSession) {
      await this.prisma.session.deleteMany({ where: { userId } });
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > validSession.expiresAt) {
      await this.prisma.session.delete({ where: { id: validSession.id } });
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const payload = { sub: user.id, email: user.email, roles: [user.role] };
    const accessToken = this.jwtService.sign(payload);
    
    return { accessToken };
  }

  async logout(userId: string) {
    await this.prisma.session.deleteMany({ where: { userId } });
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
    
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { password: hashedNew },
      });
      await tx.session.deleteMany({ where: { userId } });
      await tx.auditLog.create({
        data: { userId, action: AuditAction.UPDATE_PASSWORD, metadata: { details: 'Password changed, sessions revoked' } },
      });
    });

    return { message: 'Password changed successfully' };
  }
}
