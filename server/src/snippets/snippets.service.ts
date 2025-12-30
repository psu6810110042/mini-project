import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Snippet } from './entities/snippet.entity';
import { CreateSnippetDto } from './dto/create-snippet.dto';
import { User } from '../users/entities/user.entity';
import { Tag } from '../tags/entities/tag.entity';
import { customAlphabet } from 'nanoid';

@Injectable()
export class SnippetsService {
  constructor(
    @InjectRepository(Snippet) private snippetRepo: Repository<Snippet>,
    @InjectRepository(Tag) private tagRepo: Repository<Tag>,
  ) { }

  async create(createDto: CreateSnippetDto, user: User) {
    const snippet = new Snippet();
    const generateId = customAlphabet('123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 6);
    snippet.id = generateId();
    snippet.title = createDto.title;
    snippet.content = createDto.content;
    snippet.language = createDto.language;
    snippet.visibility = createDto.visibility;
    snippet.author = user;

    const tagEntities: Tag[] = [];

    for (const rawTagName of createDto.tags) {
      const tagName = rawTagName.toLowerCase();
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
      relations: ['tags', 'author'],
    });

    if (!snippet) throw new NotFoundException('Snippet not found');

    // Requirement Logic
    if (snippet.visibility === 'PRIVATE') {
      if (!user) throw new ForbiddenException('Private snippet');

      const isAuthor = user.id === snippet.authorId;
      const isAdmin = user.role === 'ADMIN';

      if (!isAuthor && !isAdmin) {
        throw new ForbiddenException('You do not have permission to view this');
      }
    }

    return snippet;
  }

  async findAll(user?: User): Promise<Snippet[]> {
    if (user && user.role === 'ADMIN') {
      return this.snippetRepo.find({
        relations: ['tags', 'author', 'likes'],
        order: { createdAt: 'DESC' },
      });
    }

    if (user) {
      return this.snippetRepo.find({
        where: [
          { visibility: 'PUBLIC' },
          { author: { id: user.id } }
        ],
        relations: ['tags', 'author', 'likes'],
        order: { createdAt: 'DESC' },
      });
    }

    return this.snippetRepo.find({
      where: { visibility: 'PUBLIC' },
      relations: ['tags', 'author', 'likes'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updateDto: any, user: User) {
    const snippet = await this.findOne(id, user); // Re-use findOne to handle 404/403 checks automatically

    // OWNERSHIP CHECK: Only Author or Admin can edit
    if (user.role !== 'ADMIN' && snippet.author.id !== user.id) {
      throw new ForbiddenException('You can only edit your own snippets');
    }

    // Update content/language/visibility
    // Note: We are skipping tag updates for simplicity, but you can add it if needed
    Object.assign(snippet, updateDto); 
    
    return this.snippetRepo.save(snippet);
  }

  async remove(id: string, user: User) {
    const snippet = await this.findOne(id, user); // Ensures it exists and user has view access

    // PERMISSION CHECK:
    // 1. Admin can delete anything.
    // 2. User can ONLY delete their own.
    if (user.role !== 'ADMIN' && snippet.author.id !== user.id) {
      throw new ForbiddenException('You are not allowed to delete this snippet');
    }

    return this.snippetRepo.remove(snippet);
  }

  async toggleLike(id: string, user: User) {
    const snippet = await this.snippetRepo.findOne({
      where: { id },
      relations: ['likes'], // We must load the list to check it
    });

    if (!snippet) throw new NotFoundException('Snippet not found');

    // Check if user already liked it
    const index = snippet.likes.findIndex((u) => u.id === user.id);

    if (index === -1) {
      // Not found -> Add Like
      snippet.likes.push(user);
    } else {
      // Found -> Remove Like
      snippet.likes.splice(index, 1);
    }

    return this.snippetRepo.save(snippet);
  }
}