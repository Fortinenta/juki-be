import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LoggerService } from '../modules/logger/logger.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly logger: LoggerService) {
    super({
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'query', emit: 'event' },
      ],
    });
  }

  async onModuleInit() {
    this.$on('query', (e) => {
      this.logger.debug(
        `Prisma Query: ${e.query} -- Params: ${e.params} -- Duration: ${e.duration}ms`,
        'PrismaService',
      );
    });
    this.$on('info', (e) => {
      this.logger.log(`Prisma Info: ${e.message}`, 'PrismaService');
    });
    this.$on('warn', (e) => {
      this.logger.warn(`Prisma Warn: ${e.message}`, 'PrismaService');
    });
    this.$on('error', (e) => {
      this.logger.error(`Prisma Error: ${e.message}`, e.target, 'PrismaService');
    });

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
