import { INestApplicationContext, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    super({
      datasources: {
        db: {
          url: config.get<string>('DATABASE_URL'),
        },
      },
      log: [
        { emit: 'stdout', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Prisma 5+ shutdown handling
   * WAJIB pakai process hook, bukan prisma.$on
   */
  enableShutdownHooks(app: INestApplicationContext) {
    process.on('SIGTERM', async () => {
      this.logger.log('SIGTERM received. Closing application...');
      await app.close();
    });

    process.on('SIGINT', async () => {
      this.logger.log('SIGINT received. Closing application...');
      await app.close();
    });
  }
}
