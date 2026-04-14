import { Controller, Post, Get, UseGuards, Req } from '@nestjs/common';
import { AdministrativeService } from './administrative.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FlowStatus } from '../../common/decorators/flow-status.decorator';
import { FlowStatusGuard } from '../../common/guards/flow-status.guard';
import { TRAINING_STATUS } from '../../common/constants/training-status.constants';

@Controller('administrative')
@UseGuards(JwtAuthGuard, FlowStatusGuard)
export class AdministrativeController {
  constructor(private readonly service: AdministrativeService) {}

  @Get('journals')
  async getAvailableJournals() {
    return this.service.getAvailableJournals();
  }

  @Post('start')
  @FlowStatus(TRAINING_STATUS.PAYMENT_VERIFIED)
  async startAdministrative(@Req() req: any) {
    return this.service.startAdministrative(req.user.id);
  }

  @Post('confirm')
  @FlowStatus(TRAINING_STATUS.ADMINISTRATIVE_REQUIRED, TRAINING_STATUS.ADMINISTRATIVE_REJECTED)
  async confirmAdministrative(@Req() req: any) {
    return this.service.confirmAdministrative(req.user.id);
  }
}
