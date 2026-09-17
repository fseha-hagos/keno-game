import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('idempotency_records')
export class IdempotencyRecord {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 255 })
  endpoint!: string;

  @Column({ type: 'int' })
  responseStatus!: number;

  @Column({ type: 'simple-json' })
  responseBody!: any;

  @CreateDateColumn()
  createdAt!: Date;
}
