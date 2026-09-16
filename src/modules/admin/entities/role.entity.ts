// src/modules/admin/entities/role.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  name: string; // e.g. 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'SUPPORT_ADMIN', 'COMPLIANCE_ADMIN'

  @Column({ nullable: true })
  description?: string;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @Column('simple-array', { default: '*' })
  permissions: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
