import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedSocket } from './types/authenticated-socket.interface';
import { UserRole } from '../users/entities/user.entity';

interface JwtPayload {
  sub: string | number;
  username: string;
  role: UserRole;
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: AuthenticatedSocket = context.switchToWs().getClient();
    const token = client.handshake.auth.token as string;

    if (!token) {
      throw new WsException('No token provided');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret,
      });
      // Attach user to the socket object, consistent with HTTP request user
      client.user = {
        id: Number(payload.sub),
        username: payload.username,
        role: payload.role,
      };
    } catch {
      throw new WsException('Invalid token');
    }
    return true;
  }
}
