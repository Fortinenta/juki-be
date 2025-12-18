import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminPaymentsController {
  @Get('pending')
  findPendingPayments() {
    return {
      message: 'List pending payments',
    };
  }

  @Patch(':userId/verify')
  verifyPayment(@Param('userId') userId: string) {
    return {
      message: `Payment verified for user ${userId}`,
    };
  }
}
