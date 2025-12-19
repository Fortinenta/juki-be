import { Module } from '@nestjs/common';
import { AdminArticlesController } from './admin-articles.controller';
import { AdminArticlesService } from './admin-articles.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { TrainingFlowModule } from '../training-flow/training-flow.module';

@Module({
  imports: [PrismaModule, TrainingFlowModule],
  controllers: [AdminArticlesController],
  providers: [AdminArticlesService],
})
export class AdminArticlesModule {}
