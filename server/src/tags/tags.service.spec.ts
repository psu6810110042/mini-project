import { Test, TestingModule } from '@nestjs/testing';
import { TagsService } from './tags.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tag } from './entities/tag.entity';
import { Repository } from 'typeorm';

describe('TagsService', () => {
  let service: TagsService;
  let repo: Repository<Tag>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: getRepositoryToken(Tag),
          useValue: {
            find: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
    repo = module.get(getRepositoryToken(Tag));
  });

  it('create() - should return existing tag if found (No Duplicates)', async () => {
    const existing = { id: 1, name: 'nestjs' } as Tag;
    jest.spyOn(repo, 'findOneBy').mockResolvedValue(existing);

    // Call create
    const result = await service.create({ name: 'NestJS' }); // Mixed case input

    // Expect return existing, NOT save new
    expect(result).toEqual(existing);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('create() - should save new tag if not found', async () => {
    jest.spyOn(repo, 'findOneBy').mockResolvedValue(null);
    jest.spyOn(repo, 'create').mockReturnValue({ name: 'new' } as Tag);
    jest.spyOn(repo, 'save').mockResolvedValue({ id: 2, name: 'new' } as Tag);

    const result = await service.create({ name: 'new' });

    expect(result.id).toBe(2);
    expect(repo.save).toHaveBeenCalled();
  });

  it('remove() - should call delete', async () => {
    jest.spyOn(repo, 'delete').mockResolvedValue({ affected: 1, raw: [] });
    await service.remove(1);
    expect(repo.delete).toHaveBeenCalledWith(1);
  });
});