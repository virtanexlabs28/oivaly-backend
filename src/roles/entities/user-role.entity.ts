import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Column,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Role } from './role.entity.js';

@Entity('user_roles')
@Index(['userId', 'roleId'], { unique: true })
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar' })
  roleId: string;

  @ManyToOne(() => User, (u) => u.userRoles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  @ManyToOne(() => Role, (r) => r.userRoles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role: Relation<Role>;

  @CreateDateColumn()
  assignedAt: Date;
}
