import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { RegisterDto, LoginDto, ChangePasswordDto } from './dto/auth.dto';
import { RequestWithUser } from './types/request-with-user.type';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const request = req as Request;
    const ip = request.ip || request.socket.remoteAddress || '';
    const userAgent = request.headers['user-agent'] || '';
    return this.authService.login(dto.email, dto.password, ip.toString(), userAgent);
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public() // Bypass global JwtAuthGuard (Access Token check)
  @Post('refresh')
  @UseGuards(AuthGuard('refresh'))
  async refresh(@Req() req: any) {
    const request = req as RequestWithUser;
    const { userId, refreshToken } = request.user ?? {};
    if (!userId || !refreshToken) throw new UnauthorizedException('Missing refresh token');
    return this.authService.refresh(userId, refreshToken);
  }

  @Post('logout')
  async logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  @Post('change-password')
  async changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(userId, dto.oldPassword, dto.newPassword);
  }
}
