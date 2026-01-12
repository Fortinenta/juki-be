import { IsOptional, IsString } from 'class-validator';

export class VerifyArticleDto {
  @IsOptional()
  @IsString()
  comment?: string;
}
