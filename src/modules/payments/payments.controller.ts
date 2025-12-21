import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FlowStatusGuard } from '../../common/guards/flow-status.guard';
import { FlowStatus } from '../../common/decorators/flow-status.decorator';
import type { Request } from 'express';
import { JwtUser } from '../auth/types/jwt-user.type';
import * as path from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';

@Controller('payments')
@UseGuards(JwtAuthGuard, FlowStatusGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('upload')
  @FlowStatus('PAYMENT_REQUIRED', 'PAYMENT_WAITING')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = path.join(process.cwd(), 'uploads', 'payments');
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
          const uniqueName = `${crypto.randomUUID()}-${sanitized}`;
          cb(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
        const allowedExts = ['.jpg', '.jpeg', '.png'];
        const ext = path.extname(file.originalname).toLowerCase();

        if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
          return cb(
            new BadRequestException('Only image files (jpg, jpeg, png) are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadPayment(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const request = req as Request & { user: JwtUser };
    const userId = request.user.id;

    return this.paymentsService.uploadPaymentProof({
      userId,
      file,
    });
  }
}
