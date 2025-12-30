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

  // 1. Create Tag
  async create(createTagDto: CreateTagDto) {
    const name = createTagDto.name.toLowerCase();
    
    // 1. Check if it exists
    const existingTag = await this.tagRepository.findOneBy({ name });
    
    // 2. ✅ FIX: Return it immediately if found
    if (existingTag) {
      return existingTag; 
    }

    // 3. Otherwise create new
    const tag = this.tagRepository.create({ name });
    return this.tagRepository.save(tag);
  }

  // 2. Get All Tags (The one you need right now)
  async findAll() {
    return this.tagRepository.find({
      order: { name: 'ASC' } // Sort alphabetically
    });
  }

  // 3. Get One
  findOne(id: number) {
    return this.tagRepository.findOneBy({ id });
  }

  // 4. Update
  async update(id: number, updateTagDto: UpdateTagDto) {
    await this.tagRepository.update(id, updateTagDto);
    return this.findOne(id);
  }

  // 5. Delete
  async remove(id: number) {
    return this.tagRepository.delete(id);
  }
}