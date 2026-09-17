import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('paytables')
@Index(['gameId', 'version'], { unique: false })
export class Paytable {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  gameId!: string;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'int' })
  spots!: number;

  @Column({ type: 'int' })
  hits!: number;

  @Column({ type: 'numeric', precision: 10, scale: 4 })
  multiplier!: number;

  @Column({ type: 'numeric', precision: 6, scale: 4 })
  theoreticalRtp!: number;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status!: string;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
