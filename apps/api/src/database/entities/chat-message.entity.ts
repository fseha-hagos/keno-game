import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 128, nullable: true })
  userId?: string;

  @Column({ type: 'varchar', length: 64 })
  username!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl?: string;

  @Column({ type: 'varchar', length: 32, default: '#71ce96' })
  avatarColor!: string;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'int', default: 0 })
  upvotes!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
