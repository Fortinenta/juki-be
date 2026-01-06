import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { TrainingsService } from './trainings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('trainings')
export class TrainingsController {
  constructor(private readonly trainingsService: TrainingsService) {}

  @Public()
  @Get()
  async getAvailableTrainings() {
    return this.trainingsService.getAvailableTrainings();
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
}
