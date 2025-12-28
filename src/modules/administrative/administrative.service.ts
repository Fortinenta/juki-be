import { Injectable } from '@nestjs/common';
import { TrainingFlowService } from '../training-flow/training-flow.service';
import { TRAINING_STATUS } from '../../common/constants/training-status.constants';

@Injectable()
export class AdministrativeService {
  constructor(private readonly trainingFlowService: TrainingFlowService) {}

  async confirmAdministrative(userId: string) {
    await this.trainingFlowService.transitionStatus({
      userId,
      nextStatus: TRAINING_STATUS.WAITING_ADMINISTRATIVE,
      actorId: userId,
      metadata: { action: 'CONFIRM_ADMINISTRATIVE_FORM' },
    });

    return { message: 'Administrative form submission confirmed. Waiting for admin verification.' };
  }
}
