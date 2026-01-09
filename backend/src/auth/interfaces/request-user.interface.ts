import { UserRole } from '../../users/entities/user.entity';

export interface RequestUser {
  id: number;
  username: string;
  role: UserRole;
}
