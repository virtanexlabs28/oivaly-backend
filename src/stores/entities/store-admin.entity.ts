import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Store } from './store.entity.js';

@Entity('store_admins')
@Index(['userId', 'storeId'], { unique: true })
export class StoreAdmin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  userId: string;

  @Index()
  @Column({ type: 'varchar' })
  storeId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  @ManyToOne(() => Store, (s) => s.storeAdmins, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: Relation<Store>;

  @CreateDateColumn()
  createdAt: Date;
}
