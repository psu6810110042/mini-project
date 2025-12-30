import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, UserRole } from "./entities/user.entity";
import * as bcrypt from "bcrypt";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    const adminUsername = "khetadmin"; // test user
    const adminExists = await this.findByUsername(adminUsername);

    if (!adminExists) {
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash("adminkhet123", salt);

      const admin = this.usersRepository.create({
        username: adminUsername,
        password: passwordHash,
        role: UserRole.ADMIN,
      });

      await this.usersRepository.save(admin);
    }
  }

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

  async remove(id: number, currentUser: User) {
    const userToDelete = await this.usersRepository.findOne({ where: { id } });

    if (!userToDelete) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    if (currentUser.role !== "ADMIN" && currentUser.id !== userToDelete.id) {
      throw new ForbiddenException("You cannot delete other users");
    }

    return this.usersRepository.remove(userToDelete);
  }
}
