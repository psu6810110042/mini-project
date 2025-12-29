import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Snippet } from '../../snippets/entities/snippet.entity';

@Entity()
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => Snippet, (snippet) => snippet.tags)
  snippets: Snippet[];
}