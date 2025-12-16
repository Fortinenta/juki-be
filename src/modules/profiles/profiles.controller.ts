import { Controller, Get, Put, Body } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.profilesService.getByUserId(userId);
  }

  @Put('me')
  updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      fullName?: string;
      phone?: string;
      avatarUrl?: string;
    },
  ) {
    return this.profilesService.updateProfile(userId, body);
  }
}
