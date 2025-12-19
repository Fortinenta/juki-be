import { Module } from '@nestjs/common';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { TrainingFlowModule } from '../training-flow/training-flow.module';

@Module({
  imports: [PrismaModule, TrainingFlowModule],
  controllers: [ArticlesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
