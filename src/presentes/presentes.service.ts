import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PresenteReservado } from './entities/presente-reservado.entity';

@Injectable()
export class PresentesService {
  private readonly logger = new Logger(PresentesService.name);

  constructor(
    @InjectRepository(PresenteReservado)
    private presenteRepository: Repository<PresenteReservado>,
  ) {}

  async reservar(
    presenteId: string,
    presenteNome: string,
    presenteValor: number,
    nomeConvidado: string,
    emailConvidado: string,
    telefoneConvidado: string,
    referenceId: string,
  ): Promise<PresenteReservado | null> {
    const existing = await this.presenteRepository.findOne({
      where: { presenteId },
    });

    if (existing) {
      // Reserva ainda de pé: o presente é de outro convidado.
      if (existing.status === 'pendente' || existing.status === 'pago') {
        return null;
      }

      // Reserva que expirou (checkout abandonado) ou foi cancelada. O presente
      // já voltou para a lista em verificarDisponibilidade, então aqui ele
      // precisa mesmo ser reservado de novo — e como presente_id é UNIQUE,
      // isso é feito reaproveitando a linha, não inserindo outra. Sem isto a
      // segunda reserva virava no-op: o convidado pagava e o webhook nunca
      // achava o reference_id novo para dar baixa.
      const statusAnterior = existing.status;

      existing.presenteNome = presenteNome;
      existing.presenteValor = presenteValor;
      existing.nomeConvidado = nomeConvidado;
      existing.emailConvidado = emailConvidado;
      existing.telefoneConvidado = telefoneConvidado;
      existing.referenceId = referenceId;
      existing.status = 'pendente';
      existing.dataPagamento = null;

      this.logger.log(
        `Presente ${presenteId} reservado de novo (reserva anterior: ${statusAnterior})`,
      );

      return this.presenteRepository.save(existing);
    }

    const presente = this.presenteRepository.create({
      presenteId,
      presenteNome,
      presenteValor,
      nomeConvidado,
      emailConvidado,
      telefoneConvidado,
      referenceId,
      status: 'pendente',
    });

    return this.presenteRepository.save(presente);
  }

  async verificarDisponibilidade(presenteId: string): Promise<boolean> {
    const presente = await this.presenteRepository.findOne({
      where: {
        presenteId,
        status: In(['pendente', 'pago']),
      },
    });

    return !presente;
  }

  async listarReservados(): Promise<PresenteReservado[]> {
    return this.presenteRepository.find({
      where: {
        status: In(['pendente', 'pago']),
      },
      select: ['presenteId', 'status'],
    });
  }

  async atualizarStatus(
    referenceId: string,
    novoStatus: string,
  ): Promise<PresenteReservado | null> {
    const presente = await this.presenteRepository.findOne({
      where: { referenceId },
    });

    if (!presente) {
      return null;
    }

    presente.status = novoStatus;

    if (novoStatus === 'pago') {
      presente.dataPagamento = new Date();
    }

    return this.presenteRepository.save(presente);
  }

  async buscarStatusPorReferenceId(referenceId: string): Promise<string | null> {
    const presente = await this.presenteRepository.findOne({
      where: { referenceId },
      select: ['status'],
    });
    return presente?.status ?? null;
  }

  @Cron(CronExpression.EVERY_HOUR, { name: 'limpar-reservas-expiradas' })
  async limparExpiradas(): Promise<PresenteReservado[]> {
    const dataLimite = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const expirados = await this.presenteRepository
      .createQueryBuilder()
      .update(PresenteReservado)
      .set({ status: 'expirado' })
      .where('status = :status', { status: 'pendente' })
      .andWhere('data_reserva < :dataLimite', { dataLimite })
      .returning('*')
      .execute();

    if (expirados.affected > 0) {
      this.logger.log(
        `✓ ${expirados.affected} reserva(s) expirada(s) limpa(s) automaticamente`,
      );
    }

    return expirados.raw;
  }
}
