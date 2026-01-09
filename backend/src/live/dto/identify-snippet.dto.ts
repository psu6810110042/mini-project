import { IsString, IsOptional } from 'class-validator';

export class IdentifySnippetDto {
  @IsString()
  sessionId: string;

  @IsString()
  snippetId: string;

  @IsOptional()
  @IsString()
  title?: string;
}
