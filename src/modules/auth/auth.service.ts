import { Injectable } from '@nestjs/common';
import { LoginDto, RegisterDto, ChangePasswordDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  async login(dto: LoginDto) {
    return {
      message: 'login success',
      email: dto.email,
    };
  }

  async register(dto: RegisterDto) {
    return {
      message: 'register success',
      email: dto.email,
    };
  }

  async logout(userId: string) {
    return {
      message: `user ${userId} logged out`,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    return {
      message: 'password changed',
      userId,
      oldPassword: dto.oldPassword,
      newPassword: dto.newPassword,
    };
  }
}
