import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import appConfig from './config/app.config';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AdminModule } from './modules/admin/admin.module';
import { LoggerModule } from './modules/logger/logger.module';
import { HealthController } from './health/health.controller';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ArticlesModule } from './modules/articles/articles.module';
import { AdminArticlesModule } from './modules/admin/admin-articles.module';
import { AdminReviewLoaModule } from './modules/admin/admin-review-loa.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TrainingFlowModule } from './modules/training-flow/training-flow.module';
import { TrainingsModule } from './modules/trainings/trainings.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AdministrativeModule } from './modules/administrative/administrative.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    LoggerModule,
    AuthModule,
    UsersModule,
    SessionsModule,
    ProfilesModule,
    AuditLogsModule,
    AdminModule,
    ArticlesModule,
    AdminArticlesModule,
    AdminReviewLoaModule,
    PaymentsModule,
    TrainingFlowModule,
    TrainingsModule,
    SettingsModule,
    AdministrativeModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}