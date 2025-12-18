import { Module } from '@nestjs/common';
import { TrainingFlowService } from './training-flow.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  providers: [TrainingFlowService, PrismaService],
  exports: [TrainingFlowService],
})
export class TrainingFlowModule {}
