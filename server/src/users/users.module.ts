import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])], // Connects Entity to DB
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // <--- THIS LINE IS CRITICAL
})
export class UsersModule {}