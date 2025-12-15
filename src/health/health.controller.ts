import { Controller, Get } from '@nestjs/common';
import { Public } from '../modules/auth/decorators/public.decorator';

@Controller()
export class HealthController {
  @Get()
  @Public()
  health() {
    return {
      status: 'ok',
      service: 'JUKI',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
