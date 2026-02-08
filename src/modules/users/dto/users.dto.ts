import { IsEmail, IsEnum, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import { UserRole, UserStatus } from '@prisma/client';

export class UpdateUserDto {
  // User basic info
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  // Profile info
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  nim?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  birthPlace?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  // Training flow info
  @IsOptional()
  @IsString()
  articleTitle?: string;

  @IsOptional()
  @IsString()
  journalCode?: string;

  // OJS Account info (optional)
  @IsOptional()
  @IsString()
  ojsUsername?: string;

  @IsOptional()
  @IsString()
  ojsPassword?: string;

  @IsOptional()
  @IsUrl()
  ojsJournalLink?: string;
}

export class QueryUsersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;
}
