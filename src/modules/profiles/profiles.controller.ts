import { Controller, Get, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/profiles.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  async getMyProfile(@CurrentUser('userId') userId: string) {
    return this.profilesService.findByUserId(userId);
  }

  @Get(':userId')
  async getProfile(@Param('userId') userId: string) {
    return this.profilesService.findByUserId(userId);
  }

  @Patch(':userId')
  async updateProfile(
    @Param('userId') userId: string,
    @Body() dto: UpdateProfileDto,
    @CurrentUser('userId') currentUserId: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.profilesService.update(userId, dto, currentUserId, ipAddress, userAgent);
  }

  @Delete(':userId/avatar')
  async deleteAvatar(
    @Param('userId') userId: string,
    @CurrentUser('userId') currentUserId: string,
  ) {
    return this.profilesService.deleteAvatar(userId, currentUserId);
  }
}
