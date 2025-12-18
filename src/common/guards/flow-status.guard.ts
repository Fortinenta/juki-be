import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FLOW_STATUS_KEY } from '../decorators/flow-status.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FlowStatusGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowedStatuses = this.reflector.getAllAndOverride<string[]>(FLOW_STATUS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Jika endpoint tidak punya aturan status → allow
    if (!allowedStatuses || allowedStatuses.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Unauthenticated');
    }

    const flow = await this.prisma.userTrainingFlow.findUnique({
      where: { userId: user.id },
    });

    if (!flow) {
      throw new ForbiddenException('Training flow not found');
    }

    if (!allowedStatuses.includes(flow.statusCode)) {
      throw new ForbiddenException(`Invalid status: ${flow.statusCode}`);
    }

    return true;
  }
}
