import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET")!,
    });

    // super({
    //     jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    //     ignoreExpiration: false,
    //     secretOrKey: configService.get<string>('JWT_SECRET') || 'default_secret_key',
    // });
  }

  async validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}
