import { CanActivate, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  async canActivate(context: any): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = client.handshake.auth.token;

    if (!token) {
      throw new WsException("No token provided");
    }

    try {
      const secret = this.configService.get<string>("JWT_SECRET");
      const payload = await this.jwtService.verifyAsync(token, { secret });
      // Attach user to the socket object, consistent with HTTP request user
      client["user"] = {
        id: Number(payload.sub),
        username: payload.username,
        role: payload.role,
      };
    } catch (e) {
      throw new WsException("Invalid token");
    }
    return true;
  }
}
