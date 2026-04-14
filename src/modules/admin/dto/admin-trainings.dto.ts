import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTrainingDto {
  @IsNotEmpty()
  @IsString()
  batch: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsDateString()
  startAt: string;

  @IsNotEmpty()
  @IsDateString()
  endAt: string;

  @IsNotEmpty()
  @IsString()
  location: string;

  @IsNotEmpty()
  @IsString()
  journalCode: string;

  @IsNotEmpty()
  @IsString()
  mentorName: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  quota: number;
}

export class UpdateTrainingDto {
  @IsOptional()
  @IsString()
  batch?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  journalCode?: string;

  @IsOptional()
  @IsString()
  mentorName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quota?: number;
}

export class QueryAdminTrainingsDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;
}

export class TrainingAttendanceDto {
  @IsNotEmpty()
  @IsString()
  trainingId: string;

  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  @IsEnum(['PRESENT', 'ABSENT'])
  status: 'PRESENT' | 'ABSENT';
}
