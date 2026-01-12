import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
  ],
  providers: [TasksService],
})
export class TasksModule {}
