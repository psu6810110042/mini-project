import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Snippet } from './entities/snippet.entity';
import { CreateSnippetDto } from './dto/create-snippet.dto';
import { User } from '../users/entities/user.entity';
import { Tag } from '../tags/entities/tag.entity';
import { nanoid } from 'nanoid';

@Injectable()
export class SnippetsService {
  constructor(
    @InjectRepository(Snippet) private snippetRepo: Repository<Snippet>,
    @InjectRepository(Tag) private tagRepo: Repository<Tag>,
  ) {}

async create(createDto: CreateSnippetDto, user: User) {
    const snippet = new Snippet();
    snippet.id = nanoid(6);
    snippet.content = createDto.content;
    snippet.language = createDto.language;
    snippet.visibility = createDto.visibility;
    snippet.author = user;

    const tagEntities: Tag[] = [];

    for (const tagName of createDto.tags) {
      let tag = await this.tagRepo.findOneBy({ name: tagName });
      if (!tag) {
        tag = this.tagRepo.create({ name: tagName });
        await this.tagRepo.save(tag);
      }
      tagEntities.push(tag);
    }
    snippet.tags = tagEntities;

    return this.snippetRepo.save(snippet);
}

  async findOne(id: string, user?: User) {
    const snippet = await this.snippetRepo.findOne({
      where: { id },
      relations: ['tags', 'author'], // Load relationships
    });

    if (!snippet) throw new NotFoundException('Snippet not found');

    // --- COMPLEX LOGIC REQUIREMENT ---
    if (snippet.visibility === 'PRIVATE') {
      // 1. Must be logged in
      if (!user) throw new ForbiddenException('Private snippet');
      
      // 2. Must be Admin OR Author
      const isAuthor = user.id === snippet.authorId;
      const isAdmin = user.role === 'ADMIN';

      if (!isAuthor && !isAdmin) {
        throw new ForbiddenException('You do not have permission to view this');
      }
    }
    
    return snippet;
  }
}