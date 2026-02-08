import { Controller, Get, Post, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { TrainingsService } from './trainings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { OptionalAuth } from '../auth/decorators/optional-auth.decorator';

@Controller('trainings')
export class TrainingsController {
  constructor(private readonly trainingsService: TrainingsService) {}

  @OptionalAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAvailableTrainings(@Req() req: any) {
    // Jika user sudah login, ambil userId untuk filtering
    const userId = req.user?.id;
    return this.trainingsService.getAvailableTrainings(userId);
  }

  @Get('my-training')
  @UseGuards(JwtAuthGuard)
  async getMyTraining(@Req() req: any) {
    const userId = req.user.id;
    return this.trainingsService.getMyTraining(userId);
  }

  @Public()
  @Get(':id')
  async getTrainingById(@Param('id') id: string) {
    return this.trainingsService.getTrainingById(id);
  }

  @Post(':id/select')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async selectTraining(@Param('id') trainingId: string, @Req() req: any) {
    const userId = req.user.id;
    return this.trainingsService.selectTraining(userId, trainingId);
  }

  @Delete('cancel')
  @UseGuards(JwtAuthGuard)
  async cancelTraining(@Req() req: any) {
    const userId = req.user.id;
    return this.trainingsService.cancelTraining(userId);
  }
}
