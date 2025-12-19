import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TrainingFlowService } from './training-flow.service';

@Module({
  imports: [PrismaModule],
  providers: [TrainingFlowService],
  exports: [TrainingFlowService],
})
export class TrainingFlowModule {}
