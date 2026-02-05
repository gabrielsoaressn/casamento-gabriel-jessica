import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('presentes_reservados')
export class PresenteReservado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'presente_id', unique: true })
  presenteId: string;

  @Column({ name: 'presente_nome' })
  presenteNome: string;

  @Column({ name: 'presente_valor', type: 'decimal', precision: 10, scale: 2 })
  presenteValor: number;

  @Column({ name: 'nome_convidado' })
  nomeConvidado: string;

  @Column({ name: 'email_convidado' })
  emailConvidado: string;

  @Column({ name: 'telefone_convidado', nullable: true })
  telefoneConvidado: string;

  @Column({ name: 'reference_id' })
  referenceId: string;

  @Column({ default: 'pendente' })
  status: string;

  @CreateDateColumn({ name: 'data_reserva' })
  dataReserva: Date;

  @Column({ name: 'data_pagamento', nullable: true })
  dataPagamento: Date;
}
