import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../../modules/logger/logger.service';

const SENSITIVE_KEYS = ['password', 'accessToken', 'refreshToken', 'accessSecret', 'refreshSecret'];

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object') {
    const sanitizedObj: { [key: string]: any } = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (
          SENSITIVE_KEYS.some((sensitiveKey) =>
            key.toLowerCase().includes(sensitiveKey.toLowerCase()),
          )
        ) {
          sanitizedObj[key] = '[MASKED]';
        } else {
          sanitizedObj[key] = sanitizeObject(obj[key]);
        }
      }
    }
    return sanitizedObj;
  }

  return obj;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, body, query } = request;
    const controllerName = context.getClass()?.name || 'N/A';
    const handlerName = context.getHandler()?.name || 'N/A';
    const userAgent = request.get('user-agent') || '';

    const sanitizedBody = sanitizeObject(body);
    const sanitizedQuery = sanitizeObject(query);

    const reqLog = `--> ${method} ${url}
    Query: ${JSON.stringify(sanitizedQuery)}
    Body: ${JSON.stringify(sanitizedBody)}
    IP: ${ip}
    User-Agent: ${userAgent}`;

    this.logger.log(reqLog, `[${controllerName}#${handlerName}]`);

    return next.handle().pipe(
      tap((data) => {
        const delay = Date.now() - now;
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const sanitizedData = sanitizeObject(data);

        const resLog = `<-- ${statusCode} ${method} ${url} (+${delay}ms)
    Response: ${JSON.stringify(sanitizedData)}`;

        this.logger.log(resLog, `[${controllerName}#${handlerName}]`);
      }),
    );
  }
}
