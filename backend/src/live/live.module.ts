import { Module } from '@nestjs/common';
import { LiveGateway } from './live.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { WsJwtGuard } from './ws-jwt.guard';

@Module({
  imports: [JwtModule.register({}), ConfigModule],
  providers: [LiveGateway, WsJwtGuard],
})
export class LiveModule {}
