import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from './entities/user.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';

describe('UsersService', () => {
  let service: UsersService;
  let repo: Repository<User>;

  const mockAdmin = { id: 99, role: UserRole.ADMIN } as User;
  const mockUser1 = { id: 1, role: UserRole.USER } as User;
  const mockUser2 = { id: 2, role: UserRole.USER } as User;

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
      (repo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.remove(999, mockAdmin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should BLOCK User from deleting SOMEONE ELSE', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(mockUser2);

      await expect(service.remove(2, mockUser1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should ALLOW User to delete THEMSELVES', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(mockUser1);
      (repo.remove as jest.Mock).mockResolvedValue(mockUser1);

      await service.remove(1, mockUser1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.remove).toHaveBeenCalledWith(mockUser1);
    });

    it('should ALLOW Admin to delete ANYONE', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(mockUser2);
      (repo.remove as jest.Mock).mockResolvedValue(mockUser2);

      await service.remove(2, mockAdmin);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.remove).toHaveBeenCalledWith(mockUser2);
    });
  });
});
