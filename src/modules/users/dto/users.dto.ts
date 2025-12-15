import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(['USER', 'ADMIN', 'SUPER_ADMIN'])
  @IsOptional()
  role?: string;

  @IsEnum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED'])
  @IsOptional()
  status?: string;
}

export class QueryUsersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['USER', 'ADMIN', 'SUPER_ADMIN'])
  role?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED'])
  status?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;
}
