import { Entity, PrimaryColumn, Column, ManyToOne, ManyToMany, JoinTable, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Tag } from '../../tags/entities/tag.entity';

@Entity()
export class Snippet {
  @PrimaryColumn()
  id: string; // NanoID

  @Column('text')
  content: string;

  @Column()
  language: string;

  @Column({ default: 'PUBLIC' })
  visibility: 'PUBLIC' | 'PRIVATE';

  @CreateDateColumn()
  createdAt: Date;

  // 1:N Relation
  @ManyToOne(() => User, (user) => user.snippets)
  author: User;

  @Column()
  authorId: number; // Useful helper column

  // N:M Relation
  @ManyToMany(() => Tag, (tag) => tag.snippets, { cascade: ['insert'] })
  @JoinTable()
  tags: Tag[];
}