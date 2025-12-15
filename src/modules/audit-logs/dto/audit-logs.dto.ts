import { IsOptional, IsEnum, IsDateString } from 'class-validator';

export class QueryAuditLogsDto {
  @IsOptional()
  userId?: string;

  @IsOptional()
  @IsEnum([
    'LOGIN',
    'LOGOUT',
    'REGISTER',
    'UPDATE_PROFILE',
    'UPDATE_PASSWORD',
    'DELETE_ACCOUNT',
    'REFRESH_TOKEN',
    'REVOKE_TOKEN',
  ])
  action?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;
}
