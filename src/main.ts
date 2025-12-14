import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const port = configService.get<number>('app.port');
  if (!port) {
    throw new Error('APP_PORT is not defined');
  }

  await app.listen(port);
}

void bootstrap();
