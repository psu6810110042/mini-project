import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Snippet } from 'src/snippets/entities/snippet.entity';
import { Exclude } from 'class-transformer';

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  @Exclude()
  password: string; // This will be hashed!

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  @Exclude()
  role: UserRole;

  // Placeholder for relation
  @OneToMany(() => Snippet, (snippet) => snippet.author)
  snippets: Snippet[];
}