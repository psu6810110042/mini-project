import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async create(username: string, passwordHash: string): Promise<User> {
    const user = this.usersRepository.create({
      username,
      password: passwordHash,
      role: UserRole.USER,
    });
    return this.usersRepository.save(user);
  }

  async findOne(id: number): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async remove(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }
}