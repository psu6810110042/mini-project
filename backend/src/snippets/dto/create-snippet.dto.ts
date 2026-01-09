import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsArray,
  MaxLength,
} from 'class-validator';
import { SnippetVisibility } from '../entities/snippet-visibility.enum';

export class CreateSnippetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  language: string;

  @IsEnum(SnippetVisibility)
  visibility: SnippetVisibility;

  @IsArray()
  @IsString({ each: true })
  tags: string[];
}
