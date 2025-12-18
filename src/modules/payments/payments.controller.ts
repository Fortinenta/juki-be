import {
  Controller,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { UploadPaymentDto } from './dto/upload-payment.dto';
import { diskStorage } from 'multer';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('info')
  getPaymentInfo() {
    // nanti ambil dari system_config
    return {
      bankName: 'BNI',
      accountNumber: '1234567890',
      accountName: 'PT Kampus Jurnal',
      amount: 250000,
    };
  }

  @Post('upload-proof')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/payments',
        filename: (_, file, cb) => {
          const uniqueName = `${Date.now()}-${file.originalname}`;
          cb(null, uniqueName);
        },
      }),
    }),
  )
  async uploadPaymentProof(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadPaymentDto,
    @Req() req: any,
  ) {
    return this.paymentsService.uploadPaymentProof(req.user.id, file);
  }
}
