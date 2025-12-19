import { Module } from '@nestjs/common';
import { AdminPaymentsController } from './admin-payments.controller';
import { AdminPaymentsService } from './admin-payments.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { TrainingFlowModule } from '../training-flow/training-flow.module';

@Module({
  imports: [PrismaModule, TrainingFlowModule],
  controllers: [AdminPaymentsController],
  providers: [AdminPaymentsService],
})
export class AdminModule {}
