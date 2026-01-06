import { Controller, Post, UseGuards, Req } from '@nestjs/common';
import { AdministrativeService } from './administrative.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TrainingStatus } from '../../common/constants/training-status.constants';
import { FlowStatus } from '../../common/decorators/flow-status.decorator';
import { FlowStatusGuard } from '../../common/guards/flow-status.guard';
import { TRAINING_STATUS } from '../../common/constants/training-status.constants';

@Controller('administrative')
@UseGuards(JwtAuthGuard, FlowStatusGuard)
export class AdministrativeController {
  constructor(private readonly service: AdministrativeService) {}

  @Post('confirm')
  @FlowStatus(TRAINING_STATUS.ADMINISTRATIVE_REQUIRED)
  async confirmAdministrative(@Req() req: any) {
    return this.service.confirmAdministrative(req.user.id);
  }
}
