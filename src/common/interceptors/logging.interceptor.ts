import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { LoggerService } from '../../modules/logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject(LoggerService) private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const origin = request.headers.origin || request.headers.referer || 'direct';
    const now = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const responseTime = Date.now() - now;
        let logData = '';

        if (data instanceof StreamableFile) {
          logData = '[StreamableFile]';
        } else if (data === null || data === undefined) {
          logData = String(data);
        } else {
          try {
            logData = JSON.stringify(data);
          } catch (e) {
            logData = '[Unserializable Data]';
          }
        }

        // Limit log size to avoid memory issues and log clutter
        if (logData.length > 1000) {
          logData = logData.substring(0, 1000) + '... (truncated)';
        }

        // Include origin for CORS debugging
        const originInfo = origin !== 'direct' ? ` from ${origin}` : '';
        
        this.logger.log(
          `[${method}] ${url}${originInfo} - ${responseTime}ms - Response: ${logData}`,
          'HTTP',
        );
      }),
    );
  }
}
