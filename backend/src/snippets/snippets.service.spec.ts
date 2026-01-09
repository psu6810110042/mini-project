import { Test, TestingModule } from '@nestjs/testing';
import { SnippetsService } from './snippets.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Snippet } from './entities/snippet.entity';
import { Tag } from '../tags/entities/tag.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SnippetVisibility } from './entities/snippet-visibility.enum';
import { CreateSnippetDto } from './dto/create-snippet.dto';

const mockUser = {
  id: 1,
  username: 'owner',
  role: UserRole.USER,
} as User;

const mockAdmin = {
  id: 99,
  username: 'admin',
  role: UserRole.ADMIN,
} as User;

const mockHacker = {
  id: 666,
  username: 'hacker',
  role: UserRole.USER,
} as User;

const mockTag = {
  id: 1,
  name: 'typescript',
} as Tag;

const mockSnippetPublic: Snippet = {
  id: '1241as',
  title: 'Public',
  content: 'console.log("hello world");',
  language: 'javascript',
  visibility: SnippetVisibility.PUBLIC,
  author: mockUser,
  authorId: mockUser.id,
  tags: [mockTag],
  likes: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSnippetPrivate: Snippet = {
  id: 'priv123',
  title: 'Private',
  content: 'secret_key = 12345',
  language: 'python',
  visibility: SnippetVisibility.PRIVATE,
  author: mockUser,
  authorId: mockUser.id,
  tags: [],
  likes: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('SnippetsService', () => {
  let service: SnippetsService;
  let snippetRepo: Repository<Snippet>;
  let tagRepo: Repository<Tag>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SnippetsService,
        {
          provide: getRepositoryToken(Snippet),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Tag),
          useValue: {
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SnippetsService>(SnippetsService);
    snippetRepo = module.get(getRepositoryToken(Snippet));
    tagRepo = module.get(getRepositoryToken(Tag));
  });

  describe('create', () => {
    it('should create a snippet and handle case-insensitive tags', async () => {
      const dto: CreateSnippetDto = {
        title: 'Test',
        content: 'c',
        language: 'ts',
        visibility: SnippetVisibility.PUBLIC,
        tags: ['TypeScript', 'NESTJS'],
      };

      (tagRepo.findOneBy as jest.Mock).mockResolvedValueOnce(mockTag);
      (tagRepo.findOneBy as jest.Mock).mockResolvedValueOnce(null);

      (tagRepo.create as jest.Mock).mockReturnValue({
        id: 2,
        name: 'nestjs',
      } as Tag);

      (tagRepo.save as jest.Mock).mockResolvedValue({
        id: 2,
        name: 'nestjs',
      } as Tag);

      const createdSnippet: Snippet = {
        ...mockSnippetPublic,
        ...dto,
        id: 'newId',
        author: mockUser,
        authorId: mockUser.id,
        tags: [mockTag, { id: 2, name: 'nestjs' } as Tag],
      };

      (snippetRepo.create as jest.Mock).mockReturnValue(createdSnippet);
      (snippetRepo.save as jest.Mock).mockResolvedValue(createdSnippet);

      await service.create(dto, mockUser);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(tagRepo.findOneBy).toHaveBeenCalledWith({ name: 'typescript' });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(tagRepo.findOneBy).toHaveBeenCalledWith({ name: 'nestjs' });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(snippetRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          author: mockUser,
          authorId: mockUser.id,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if snippet does not exist', async () => {
      (snippetRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne('badId')).rejects.toThrow(NotFoundException);
    });

    it('should allow Guest to view PUBLIC snippet', async () => {
      (snippetRepo.findOne as jest.Mock).mockResolvedValue(mockSnippetPublic);
      const result = await service.findOne('pub123', null as unknown as User);
      expect(result).toEqual(mockSnippetPublic);
    });

    it('should BLOCK Guest from viewing PRIVATE snippet', async () => {
      (snippetRepo.findOne as jest.Mock).mockResolvedValue(mockSnippetPrivate);
      await expect(
        service.findOne('priv123', null as unknown as User),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should BLOCK Hacker from viewing PRIVATE snippet', async () => {
      (snippetRepo.findOne as jest.Mock).mockResolvedValue(mockSnippetPrivate);
      await expect(service.findOne('priv123', mockHacker)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should ALLOW Owner to view PRIVATE snippet', async () => {
      (snippetRepo.findOne as jest.Mock).mockResolvedValue(mockSnippetPrivate);
      const result = await service.findOne('priv123', mockUser);
      expect(result).toEqual(mockSnippetPrivate);
    });

    it('should ALLOW Admin to view PRIVATE snippet', async () => {
      (snippetRepo.findOne as jest.Mock).mockResolvedValue(mockSnippetPrivate);
      const result = await service.findOne('priv123', mockAdmin);
      expect(result).toEqual(mockSnippetPrivate);
    });
  });

  describe('findAll', () => {
    it('should return everything for ADMIN', async () => {
      (snippetRepo.find as jest.Mock).mockResolvedValue([
        mockSnippetPublic,
        mockSnippetPrivate,
      ]);

      await service.findAll(mockAdmin);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(snippetRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'DESC' } }),
      );
    });

    it('should return PUBLIC + OWN for User', async () => {
      (snippetRepo.find as jest.Mock).mockResolvedValue([]);

      await service.findAll(mockUser);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(snippetRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            { visibility: SnippetVisibility.PUBLIC },
            { author: { id: mockUser.id } },
          ],
        }),
      );
    });

    it('should return only PUBLIC for Guest', async () => {
      (snippetRepo.find as jest.Mock).mockResolvedValue([]);

      await service.findAll(null as unknown as User);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(snippetRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { visibility: SnippetVisibility.PUBLIC },
        }),
      );
    });
  });

  describe('update', () => {
    it('should BLOCK Hacker from updating', async () => {
      (snippetRepo.findOne as jest.Mock).mockResolvedValue(mockSnippetPublic);

      await expect(
        service.update('pub123', { title: 'Hacked' }, mockHacker),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should ALLOW Admin to update', async () => {
      (snippetRepo.findOne as jest.Mock).mockResolvedValue(mockSnippetPublic);
      (snippetRepo.save as jest.Mock).mockResolvedValue(mockSnippetPublic);

      await service.update('pub123', { title: 'Admin Edit' }, mockAdmin);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(snippetRepo.save).toHaveBeenCalled();
    });

    it('should update tags if provided in DTO', async () => {
      (snippetRepo.findOne as jest.Mock).mockResolvedValue(mockSnippetPublic);
      (tagRepo.findOneBy as jest.Mock).mockResolvedValue(mockTag);
      (snippetRepo.save as jest.Mock).mockResolvedValue(mockSnippetPublic);

      await service.update('pub123', { tags: ['TypeScript'] }, mockUser);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(tagRepo.findOneBy).toHaveBeenCalledWith({ name: 'typescript' });
    });
  });

  describe('remove', () => {
    it('should BLOCK Hacker from deleting', async () => {
      (snippetRepo.findOne as jest.Mock).mockResolvedValue(mockSnippetPublic);

      await expect(service.remove('pub123', mockHacker)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should ALLOW Owner to delete', async () => {
      (snippetRepo.findOne as jest.Mock).mockResolvedValue(mockSnippetPublic);
      (snippetRepo.remove as jest.Mock).mockResolvedValue(mockSnippetPublic);

      await service.remove('pub123', mockUser);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(snippetRepo.remove).toHaveBeenCalledWith(mockSnippetPublic);
    });
  });

  describe('toggleLike', () => {
    it('should ADD like if not present', async () => {
      const snippetNoLikes: Snippet = { ...mockSnippetPublic, likes: [] };

      (snippetRepo.findOne as jest.Mock).mockResolvedValue(snippetNoLikes);
      (snippetRepo.save as jest.Mock).mockImplementation((s) => s as Snippet);

      const result = await service.toggleLike('pub123', mockUser);

      expect(result.likes).toHaveLength(1);
      expect(result.likes[0]).toEqual(mockUser);
    });

    it('should REMOVE like if already present', async () => {
      const snippetWithLike: Snippet = {
        ...mockSnippetPublic,
        likes: [mockUser],
      };

      (snippetRepo.findOne as jest.Mock).mockResolvedValue(snippetWithLike);
      (snippetRepo.save as jest.Mock).mockImplementation((s) => s as Snippet);

      const result = await service.toggleLike('pub123', mockUser);

      expect(result.likes).toHaveLength(0);
    });
  });
});
