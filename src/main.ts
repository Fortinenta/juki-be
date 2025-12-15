import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { validationPipeConfig } from './common/pipes/validation.pipe';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // CORS configuration
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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

  console.log(`🚀 JUKI API Server listening on http://localhost:${port}/api/v1}`);
  console.log(`Running in ${configService.get<string>('app.env')} mode`);
}

bootstrap();
