import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  MaxLength,
} from "class-validator";

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

  @IsEnum(["PUBLIC", "PRIVATE"])
  visibility: "PUBLIC" | "PRIVATE";

  @IsArray()
  @IsString({ each: true })
  tags: string[];
}
