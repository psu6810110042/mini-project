import { Module } from '@nestjs/common';
import { LiveGateway } from './live.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { WsJwtGuard } from './ws-jwt.guard';
import { SnippetsModule } from '../snippets/snippets.module';
import { LiveSessionManager } from './live-session-manager.service';

@Module({
  imports: [JwtModule.register({}), ConfigModule, SnippetsModule],
  providers: [LiveGateway, WsJwtGuard, LiveSessionManager],
})
export class LiveModule {}
