import { IsString, IsOptional, IsEnum } from 'class-validator';
import { SnippetVisibility } from '../../snippets/entities/snippet-visibility.enum';

export class JoinSessionDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(SnippetVisibility)
  visibility?: SnippetVisibility;
}
