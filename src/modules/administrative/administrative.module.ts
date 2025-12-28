import { Module } from '@nestjs/common';
import { AdministrativeController } from './administrative.controller';
import { AdministrativeService } from './administrative.service';
import { TrainingFlowModule } from '../training-flow/training-flow.module';

@Module({
  imports: [TrainingFlowModule],
  controllers: [AdministrativeController],
  providers: [AdministrativeService],
})
export class AdministrativeModule {}
