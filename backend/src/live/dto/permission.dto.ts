import { IsString, IsNumber } from 'class-validator';

export class PermissionDto {
  @IsString()
  sessionId: string;

  @IsNumber()
  userId: number;
}
