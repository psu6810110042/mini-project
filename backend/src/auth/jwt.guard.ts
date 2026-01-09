import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../users/entities/user.entity';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = User>(
    err: Error | null,
    user: User,
    // info: any,
    // context: ExecutionContext,
    // status?: any,
  ): TUser {
    return user as TUser;
  }
}
