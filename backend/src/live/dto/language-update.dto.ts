import { IsString } from 'class-validator';

export class LanguageUpdateDto {
  @IsString()
  sessionId: string;

  @IsString()
  language: string;
}
