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
} from '@nestjs/common';
import { SnippetsService } from './snippets.service';
import { CreateSnippetDto } from './dto/create-snippet.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { UpdateSnippetDto } from './dto/update-snippet.dto';
import { User } from '../users/entities/user.entity';

@Controller('snippets')
export class SnippetsController {
  constructor(private readonly snippetsService: SnippetsService) {}

  /**
   * Create a new snippet.
   * @param req - Request object containing the user.
   * @param createDto - Data for creating a snippet (title, content, public/private).
   * @returns The created snippet object.
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req: { user: User }, @Body() createDto: CreateSnippetDto) {
    return this.snippetsService.create(createDto, req.user);
  }

  /**
   * Get a single snippet by ID.
   * @param req - Request object (optional user info).
   * @param id - The snippet ID.
   * @description Uses OptionalJwtAuthGuard to allow both public and authenticated access.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(@Request() req: { user?: User }, @Param('id') id: string) {
    return this.snippetsService.findOne(id, req.user);
  }

  /**
   * Get all snippets (Public feed + User's own if logged in).
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(@Request() req: { user?: User }) {
    return this.snippetsService.findAll(req.user);
  }

  /**
   * Update a snippet.
   * @returns The updated snippet.
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSnippetDto,
    @Request() req: { user: User },
  ) {
    return this.snippetsService.update(id, updateDto, req.user);
  }

  /**
   * Delete a snippet.
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: User }) {
    return this.snippetsService.remove(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  like(@Param('id') id: string, @Request() req: { user: User }) {
    return this.snippetsService.toggleLike(id, req.user);
  }
}
