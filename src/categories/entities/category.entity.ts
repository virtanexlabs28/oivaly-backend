import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';
import { CategoryStatus } from '../enums/category-status.enum.js';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true, length: 100 })
  name: string;

  @Column({ type: 'varchar', unique: true, length: 120 })
  slug: string;

  @Column({ type: 'varchar', nullable: true, length: 500 })
  description: string | null;

  @Column({ type: 'varchar', nullable: true, length: 500 })
  imageUrl: string | null;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  parentId: string | null;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;

  @Index()
  @Column({
    type: 'enum',
    enum: CategoryStatus,
    default: CategoryStatus.ACTIVE,
  })
  status: CategoryStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Category, (c) => c.children, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent: Relation<Category> | null;

  @OneToMany(() => Category, (c) => c.parent)
  children: Relation<Category[]>;
}
