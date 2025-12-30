import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
  Delete,
} from "@nestjs/common";
import { SnippetsService } from "./snippets.service";
import { CreateSnippetDto } from "./dto/create-snippet.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/jwt.guard";
import type { Request as ExpressRequest } from "express";
import { UpdateSnippetDto } from "./dto/update-snippet.dto";
import { User } from "../users/entities/user.entity";

@Controller("snippets")
export class SnippetsController {
  constructor(private readonly snippetsService: SnippetsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req, @Body() createDto: CreateSnippetDto) {
    return this.snippetsService.create(createDto, req.user);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(":id")
  findOne(@Request() req, @Param("id") id: string) {
    return this.snippetsService.findOne(id, req.user);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(@Request() req) {
    return this.snippetsService.findAll(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateDto: UpdateSnippetDto,
    @Request() req: ExpressRequest,
  ) {
    return this.snippetsService.update(id, updateDto, req.user as User);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  remove(@Param("id") id: string, @Request() req) {
    return this.snippetsService.remove(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/like")
  like(@Param("id") id: string, @Request() req) {
    return this.snippetsService.toggleLike(id, req.user);
  }
}
