import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: user.id, username: user.username, role: user.role },
    };
  }

  async register(username: string, pass: string) {
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(pass, salt);

    try {
      const user = await this.usersService.create(username, hash);
      return user;
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Username already taken');
      }
      throw new InternalServerErrorException();
    }
  }
}
