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
      return null;
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
