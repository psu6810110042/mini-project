import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './entities/tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
  ) {}

  async create(createTagDto: CreateTagDto) {
    const name = createTagDto.name.toLowerCase();

    const existingTag = await this.tagRepository.findOneBy({ name });

    if (existingTag) {
      return existingTag;
    }

    const tag = this.tagRepository.create({ name });
    return this.tagRepository.save(tag);
  }

  async findAll() {
    return this.tagRepository.find({
      order: { name: 'ASC' },
    });
  }

  findOne(id: number) {
    return this.tagRepository.findOneBy({ id });
  }

  async update(id: number, updateTagDto: UpdateTagDto) {
    await this.tagRepository.update(id, updateTagDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    return this.tagRepository.delete(id);
  }
}
