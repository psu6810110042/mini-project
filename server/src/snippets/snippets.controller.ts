import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SnippetsService } from './snippets.service';
import { CreateSnippetDto } from './dto/create-snippet.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/jwt.guard'; // You'll create this

@Controller('snippets')
export class SnippetsController {
  constructor(private readonly snippetsService: SnippetsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req, @Body() createDto: CreateSnippetDto) {
    // req.user comes from JwtStrategy
    return this.snippetsService.create(createDto, req.user);
  }

  // Use a custom guard that allows guest access but attaches user if token exists
  @UseGuards(OptionalJwtAuthGuard) 
  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.snippetsService.findOne(id, req.user);
  }
}