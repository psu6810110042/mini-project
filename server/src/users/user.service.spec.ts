import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';

describe('UsersService', () => {
  let service: UsersService;
  let repo: Repository<User>;

  const mockAdmin = { id: 99, role: 'ADMIN' } as User;
  const mockUser1 = { id: 1, role: 'USER' } as User;
  const mockUser2 = { id: 2, role: 'USER' } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  describe('remove', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);
      await expect(service.remove(999, mockAdmin)).rejects.toThrow(NotFoundException);
    });

    it('should BLOCK User from deleting SOMEONE ELSE', async () => {
      // User 1 tries to delete User 2
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockUser2); // Target is User 2
      
      await expect(service.remove(2, mockUser1)).rejects.toThrow(ForbiddenException);
    });

    it('should ALLOW User to delete THEMSELVES', async () => {
      // User 1 tries to delete User 1
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockUser1);
      jest.spyOn(repo, 'remove').mockResolvedValue(mockUser1);

      await service.remove(1, mockUser1);
      expect(repo.remove).toHaveBeenCalledWith(mockUser1);
    });

    it('should ALLOW Admin to delete ANYONE', async () => {
      // Admin tries to delete User 2
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockUser2);
      jest.spyOn(repo, 'remove').mockResolvedValue(mockUser2);

      await service.remove(2, mockAdmin);
      expect(repo.remove).toHaveBeenCalledWith(mockUser2);
    });
  });
});