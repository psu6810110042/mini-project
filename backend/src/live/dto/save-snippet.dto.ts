import { IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateSnippetDto } from '../../snippets/dto/update-snippet.dto';

export class SaveSnippetDto {
  @IsString()
  sessionId: string;

  @ValidateNested()
  @Type(() => UpdateSnippetDto)
  updateDto: UpdateSnippetDto;
}
