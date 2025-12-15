import { ValidationPipe } from '@nestjs/common';

export const validationPipeConfig = new ValidationPipe({
  whitelist: true, // Strip properties that don't have decorators
  forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
  transform: true, // Automatically transform payloads to DTO instances
  transformOptions: {
    enableImplicitConversion: true, // Allow implicit type conversion
  },
});
