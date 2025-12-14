import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import appConfig from './config/app.config';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SessionsModule,
    ProfilesModule,
    AuditLogsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
