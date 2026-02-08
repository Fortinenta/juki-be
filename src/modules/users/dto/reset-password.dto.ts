import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class AdminResetPasswordDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  newPassword?: string; // Optional: admin bisa set manual atau auto-generate

  @IsOptional()
  @IsBoolean()
  autoGenerate?: boolean; // Default: true
}
