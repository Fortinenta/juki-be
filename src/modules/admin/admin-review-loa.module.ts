import { Module } from '@nestjs/common';
import { AdminReviewLoaController } from './admin-review-loa.controller';
import { AdminReviewLoaService } from './admin-review-loa.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { TrainingFlowModule } from '../training-flow/training-flow.module';

@Module({
  imports: [PrismaModule, TrainingFlowModule],
  controllers: [AdminReviewLoaController],
  providers: [AdminReviewLoaService],
})
export class AdminReviewLoaModule {}
