import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Inject } from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../../modules/logger/logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(@Inject(LoggerService) private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        exception instanceof HttpException ? exception.getResponse() : 'Internal server error',
    };

    this.logger.error(
      `[${request.method}] ${request.url} - ${status} - ${JSON.stringify(errorResponse)}`,
      exception instanceof Error ? exception.stack : '',
      'ExceptionFilter',
    );

    response.status(status).json(errorResponse);
  }
}
