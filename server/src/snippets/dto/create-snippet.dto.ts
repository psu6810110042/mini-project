import { IsNotEmpty, IsString, IsEnum, IsArray, IsOptional, MaxLength } from 'class-validator';

export class CreateSnippetDto{
  @IsString()
  @IsNotEmpty()
  @MaxLength(100) // Good practice to limit titles
  title: string;  // <--- ADD THIS

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