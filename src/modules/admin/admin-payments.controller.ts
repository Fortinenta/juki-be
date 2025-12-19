import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { AdminPaymentsService } from './admin-payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminPaymentsController {
  constructor(private readonly adminPaymentsService: AdminPaymentsService) {}

  @Post(':userId/verify')
  async verifyPayment(@Param('userId') userId: string) {
    return this.adminPaymentsService.verifyPayment(userId);
  }
}
