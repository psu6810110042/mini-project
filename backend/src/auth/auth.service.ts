import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';

type UserWithoutPassword = Omit<User, 'password'>;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    username: string,
    pass: string,
  ): Promise<UserWithoutPassword | null> {
    const user = await this.usersService.findByUsername(username);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { ...result } = user;
      return result;
    }
    return null;
  }

  login(user: UserWithoutPassword) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  async register(username: string, pass: string) {
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(pass, salt);

    try {
      const user = await this.usersService.create(username, hash);
      return user;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: unknown }).code === '23505'
      ) {
        throw new ConflictException('Username already taken');
      }
      throw new InternalServerErrorException();
    }
  }
}
