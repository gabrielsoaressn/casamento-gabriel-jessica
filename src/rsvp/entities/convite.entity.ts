import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Convidado } from './convidado.entity';

@Entity('convites')
export class Convite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  codigo: string;

  @Column()
  entrega: string;

  @Column()
  grupo: string;

  @Column({ name: 'confirmado_em', type: 'timestamptz', nullable: true })
  confirmadoEm: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Convidado, (convidado) => convidado.convite, {
    cascade: true,
    eager: false,
  })
  convidados: Convidado[];
}
