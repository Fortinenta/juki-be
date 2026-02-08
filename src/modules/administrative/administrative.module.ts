import { Module } from '@nestjs/common';
import { AdministrativeController } from './administrative.controller';
import { AdministrativeService } from './administrative.service';
import { TrainingFlowModule } from '../training-flow/training-flow.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [TrainingFlowModule, PrismaModule],
  controllers: [AdministrativeController],
  providers: [AdministrativeService],
})
export class AdministrativeModule {}
