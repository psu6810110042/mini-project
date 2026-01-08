import { Module } from '@nestjs/common';
import { LiveGateway } from './live.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { WsJwtGuard } from './ws-jwt.guard';
import { SnippetsModule } from '../snippets/snippets.module';

@Module({
  imports: [JwtModule.register({}), ConfigModule, SnippetsModule],
  providers: [LiveGateway, WsJwtGuard],
})
export class LiveModule { }
