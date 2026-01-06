import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum PaymentVerifyAction {
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
}

export class VerifyPaymentDto {
  @IsEnum(PaymentVerifyAction)
  action: PaymentVerifyAction;

  @IsOptional()
  @IsString()
  reason?: string;
}
