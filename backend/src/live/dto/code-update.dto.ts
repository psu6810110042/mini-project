import { IsString } from 'class-validator';

export class CodeUpdateDto {
  @IsString()
  sessionId: string;

  @IsString()
  code: string;
}
