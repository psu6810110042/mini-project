import { Socket } from 'socket.io';
import { RequestUser } from '../../auth/interfaces/request-user.interface';

export interface AuthenticatedSocket extends Socket {
  user: RequestUser;
}
