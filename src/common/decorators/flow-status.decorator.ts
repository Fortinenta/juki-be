import { SetMetadata } from '@nestjs/common';
import { TrainingStatus } from '../constants/training-status.constants';

export const FLOW_STATUS_KEY = 'flow_status';

export const FlowStatus = (...allowedStatuses: TrainingStatus[]) =>
  SetMetadata(FLOW_STATUS_KEY, allowedStatuses);
