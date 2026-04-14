import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

import { AdminPaymentsController } from './admin-payments.controller';
import { AdminPaymentsService } from './admin-payments.service';

import { AdminAdministrativeController } from './admin-administrative.controller';
import { AdminAdministrativeService } from './admin-administrative.service';

import { AdminArticlesModule } from './admin-articles.module';
import { AdminReviewLoaModule } from './admin-review-loa.module';

import { AdminTrainingsController } from './admin-trainings.controller';
import { AdminTrainingsService } from './admin-trainings.service';
import { TrainingFlowModule } from '../training-flow/training-flow.module';

@Module({
  imports: [PrismaModule, AdminArticlesModule, AdminReviewLoaModule, TrainingFlowModule],
  controllers: [AdminPaymentsController, AdminAdministrativeController, AdminTrainingsController],
  providers: [AdminPaymentsService, AdminAdministrativeService, AdminTrainingsService],
})
export class AdminModule {}
