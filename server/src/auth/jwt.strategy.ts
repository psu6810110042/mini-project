import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET')!,
        });

        // super({
        //     jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        //     ignoreExpiration: false,
        //     secretOrKey: configService.get<string>('JWT_SECRET') || 'default_secret_key',
        // });
    }

  async validate(payload: any) {
    // This attaches `req.user` to your controllers
    return { id: payload.sub, username: payload.username, role: payload.role };
  }
}