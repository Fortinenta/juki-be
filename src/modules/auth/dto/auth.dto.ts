import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  nim: string;

  @IsString()
  @IsNotEmpty()
  phone: string; // whatsapp or phone

  @IsString()
  @IsNotEmpty()
  birthPlace: string;

  @IsDateString()
  birthDate: Date;

  @IsEnum(['MALE', 'FEMALE']) // Asumsi enum gender di schema
  gender: string;

  // Tambah fields lain jika needed dari Profile (fakultas, jurusan, dll.)
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  oldPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
