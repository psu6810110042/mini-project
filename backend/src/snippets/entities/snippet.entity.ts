import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Tag } from '../../tags/entities/tag.entity';
import { SnippetVisibility } from './snippet-visibility.enum';

@Entity()
export class Snippet {
  @PrimaryColumn()
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column()
  language: string;

  @Column({
    type: 'enum',
    enum: SnippetVisibility,
    default: SnippetVisibility.PUBLIC,
  })
  visibility: SnippetVisibility;

  @ManyToOne(() => User, (user) => user.snippets, {
    onDelete: 'CASCADE',
  })
  author: User;

  @Column()
  authorId: number;

  @ManyToMany(() => Tag, (tag) => tag.snippets, { cascade: ['insert'] })
  @JoinTable()
  tags: Tag[];

  @ManyToMany(() => User, { cascade: true })
  @JoinTable()
  likes: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
