import { IsNotEmpty, IsString, IsEnum, IsArray, IsOptional } from 'class-validator';

export class CreateSnippetDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  language: string;

  @IsEnum(['PUBLIC', 'PRIVATE'])
  visibility: 'PUBLIC' | 'PRIVATE';

  @IsArray()
  @IsString({ each: true }) // Ensures every item in the array is a string
  tags: string[];
}