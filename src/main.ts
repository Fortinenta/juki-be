import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { validationPipeConfig } from './common/pipes/validation.pipe';
import { LoggerService } from './modules/logger/logger.service';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Use Winston logger
  const logger = app.get(LoggerService);
  app.useLogger(logger);

  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // CORS configuration
  app.enableCors({
    origin: [
      'http://localhost:3002', // development FE
      'https://juki-hub.rurustudio.cloud', // production frontend
      configService.get<string>('CORS_ORIGIN', '*'), // fallback dari env
    ],
    credentials: false, // Set false untuk menghindari preflight issues
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'ngrok-skip-browser-warning', // untuk ngrok testing
    ],
  });

  // Serve static log files
  app.useStaticAssets(join(__dirname, '..', 'logs'), {
    prefix: '/log',
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global pipes
  app.useGlobalPipes(validationPipeConfig);

  const port = configService.get<number>('app.port', 3000);
  await app.listen(port);

  const env = configService.get<string>('app.env');
  logger.log(`🚀 JUKI API Server listening on http://localhost:${port}/api/v1`, 'Bootstrap');
  logger.log(`Running in ${env} mode`, 'Bootstrap');
  logger.log(`CORS enabled for: http://localhost:3002, https://juki-hub.rurustudio.cloud`, 'Bootstrap');
  logger.log(`Log files available at: /log/log_YYYY-MM-DD.txt`, 'Bootstrap');
  
  console.log(`🚀 JUKI API Server listening on http://localhost:${port}/api/v1}`);
  console.log(`Running in ${env} mode`);
  console.log(`CORS enabled for: http://localhost:3002, https://juki-hub.rurustudio.cloud`);
}

bootstrap();
