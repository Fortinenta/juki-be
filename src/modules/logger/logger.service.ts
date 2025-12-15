import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    const logFormat = winston.format.printf(({ level, message, timestamp, context, trace }) => {
      let log = `[${level.toUpperCase()}] ${timestamp} [${context || 'N/A'}] - ${message}`;
      if (trace) {
        log += `\nTrace: ${trace}`;
      }
      return log;
    });

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        logFormat,
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(winston.format.colorize(), logFormat),
        }),
        new winston.transports.DailyRotateFile({
          filename: 'logs/log_%DATE%.txt',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
        }),
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }
}
