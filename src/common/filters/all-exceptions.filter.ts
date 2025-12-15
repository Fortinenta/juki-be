import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  ExecutionContext,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../../modules/logger/logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        (typeof message === 'string' ? message : (message as any)?.message) ||
        (exception instanceof Error ? exception.message : 'Internal Server Error'),
    };

    const controllerName = (host as ExecutionContext).getClass()?.name || 'N/A';
    const handlerName = (host as ExecutionContext).getHandler()?.name || 'N/A';

    this.logger.error(
      `HTTP Error: ${errorResponse.message}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
      `[${controllerName}#${handlerName}] ${request.method} ${request.url}`,
    );

    response.status(status).json(errorResponse);
  }
}
