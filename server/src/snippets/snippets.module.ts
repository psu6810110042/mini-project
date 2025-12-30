import { Module } from "@nestjs/common";
import { SnippetsService } from "./snippets.service";
import { SnippetsController } from "./snippets.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Snippet } from "./entities/snippet.entity";
import { Tag } from "../tags/entities/tag.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Snippet, Tag])],
  controllers: [SnippetsController],
  providers: [SnippetsService],
})
export class SnippetsModule {}
