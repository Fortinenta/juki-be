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

    // Ignore logging untuk error yang tidak penting (noise)
    const shouldIgnore =
      status === 401 || // Unauthorized - normal behavior
      (status === 404 && (request.url === '/' || request.url === '')) || // Root path 404
      (status === 404 && request.method === 'PROPFIND'); // WebDAV requests

    if (shouldIgnore) {
      // Log 401 sebagai WARN
      if (status === 401) {
        this.logger.warn(
          `[${request.method}] ${request.url} - ${status} - Unauthorized access attempt`,
          'ExceptionFilter',
        );
      }
      // Ignore 404 root path dan PROPFIND (biasanya dari scanner/bot)
    } else if (status === 400) {
      // Log 400 Bad Request sebagai WARN (validation error, bukan server error)
      const message =
        typeof errorResponse.message === 'object'
          ? JSON.stringify(errorResponse.message)
          : errorResponse.message;
      this.logger.warn(
        `[${request.method}] ${request.url} - ${status} - ${message}`,
        'ExceptionFilter',
      );
    } else {
      // Log error serius (500, database error, dll) sebagai ERROR dengan full details
      this.logger.error(
        `[${request.method}] ${request.url} - ${status} - ${JSON.stringify(errorResponse)}`,
        exception instanceof Error ? exception.stack : '',
        'ExceptionFilter',
      );
    }

    response.status(status).json(errorResponse);
  }
}
