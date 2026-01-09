import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Snippet } from './entities/snippet.entity';
import { CreateSnippetDto } from './dto/create-snippet.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Tag } from '../tags/entities/tag.entity';
import { UpdateSnippetDto } from './dto/update-snippet.dto';
import { customAlphabet } from 'nanoid';
import { SnippetVisibility } from './entities/snippet-visibility.enum';

@Injectable()
export class SnippetsService {
  constructor(
    @InjectRepository(Snippet) private snippetRepo: Repository<Snippet>,
    @InjectRepository(Tag) private tagRepo: Repository<Tag>,
  ) {}

  async create(createDto: CreateSnippetDto, user: User) {
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

    const generateId = customAlphabet(
      '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
      6,
    );

    const snippet = this.snippetRepo.create({
      id: generateId(),
      title: createDto.title,
      content: createDto.content,
      language: createDto.language,
      visibility: createDto.visibility,
      author: user,
      authorId: user.id,
      tags: tagEntities,
    });

    return this.snippetRepo.save(snippet);
  }

  async findOne(id: string, user?: User) {
    const snippet = await this.snippetRepo.findOne({
      where: { id },
      relations: ['tags', 'author'],
    });

    if (!snippet) throw new NotFoundException('Snippet not found');

    if (snippet.visibility === SnippetVisibility.PRIVATE) {
      if (!user) throw new ForbiddenException('Private snippet');

      const isAuthor = user.id === snippet.authorId;
      const isAdmin = user.role === UserRole.ADMIN;

      if (!isAuthor && !isAdmin) {
        throw new ForbiddenException('You do not have permission to view this');
      }
    }

    return snippet;
  }

  async findAll(user?: User): Promise<Snippet[]> {
    if (user && user.role === UserRole.ADMIN) {
      return this.snippetRepo.find({
        relations: ['tags', 'author', 'likes'],
        order: { createdAt: 'DESC' },
      });
    }

    if (user) {
      return this.snippetRepo.find({
        where: [
          { visibility: SnippetVisibility.PUBLIC },
          { author: { id: user.id } },
        ],
        relations: ['tags', 'author', 'likes'],
        order: { createdAt: 'DESC' },
      });
    }

    return this.snippetRepo.find({
      where: { visibility: SnippetVisibility.PUBLIC },
      relations: ['tags', 'author', 'likes'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updateDto: UpdateSnippetDto, user: User) {
    const snippet = await this.findOne(id, user);

    if (user.role !== UserRole.ADMIN && snippet.authorId !== user.id) {
      throw new ForbiddenException(
        'You are not authorized to edit this snippet',
      );
    }

    if (updateDto.tags) {
      const tagEntities: Tag[] = [];

      for (const rawTagName of updateDto.tags) {
        const tagName = rawTagName.toLowerCase();

        let tag = await this.tagRepo.findOneBy({ name: tagName });

        if (!tag) {
          tag = this.tagRepo.create({ name: tagName });
          await this.tagRepo.save(tag);
        }

        tagEntities.push(tag);
      }

      snippet.tags = tagEntities;
    }

    if (updateDto.title) snippet.title = updateDto.title;
    if (updateDto.content) snippet.content = updateDto.content;
    if (updateDto.language) snippet.language = updateDto.language;
    if (updateDto.visibility) snippet.visibility = updateDto.visibility;

    return this.snippetRepo.save(snippet);
  }

  async updateShared(id: string, updateDto: UpdateSnippetDto) {
    // For shared updates via LiveSession, we trust the caller (Gateway)
    // to have verified session permissions. We don't check author ownership here.
    const snippet = await this.snippetRepo.findOne({
      where: { id },
      relations: ['tags', 'author'],
    });

    if (!snippet) throw new NotFoundException('Snippet not found');

    if (updateDto.tags) {
      const tagEntities: Tag[] = [];

      for (const rawTagName of updateDto.tags) {
        const tagName = rawTagName.toLowerCase();

        let tag = await this.tagRepo.findOneBy({ name: tagName });

        if (!tag) {
          tag = this.tagRepo.create({ name: tagName });
          await this.tagRepo.save(tag);
        }

        tagEntities.push(tag);
      }

      snippet.tags = tagEntities;
    }

    if (updateDto.title) snippet.title = updateDto.title;
    if (updateDto.content) snippet.content = updateDto.content;
    if (updateDto.language) snippet.language = updateDto.language;
    if (updateDto.visibility) snippet.visibility = updateDto.visibility;

    return this.snippetRepo.save(snippet);
  }

  async remove(id: string, user: User) {
    const snippet = await this.findOne(id, user);

    if (user.role !== UserRole.ADMIN && snippet.author.id !== user.id) {
      throw new ForbiddenException(
        'You are not allowed to delete this snippet',
      );
    }

    return this.snippetRepo.remove(snippet);
  }

  async toggleLike(id: string, user: User) {
    const snippet = await this.snippetRepo.findOne({
      where: { id },
      relations: ['likes'],
    });

    if (!snippet) throw new NotFoundException('Snippet not found');

    const index = snippet.likes.findIndex((u) => u.id === user.id);

    if (index === -1) {
      snippet.likes.push(user);
    } else {
      snippet.likes.splice(index, 1);
    }

    return this.snippetRepo.save(snippet);
  }
}
