import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Convite } from './convite.entity';

@Entity('convidados')
export class Convidado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'convite_id' })
  conviteId: string;

  @ManyToOne(() => Convite, (convite) => convite.convidados)
  @JoinColumn({ name: 'convite_id' })
  convite: Convite;

  @Column()
  nome: string;

  @Column({ name: 'vai_comparecer', type: 'boolean', nullable: true })
  vaiComparecer: boolean | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
