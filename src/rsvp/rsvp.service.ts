import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { ConfigService } from '@nestjs/config';
import { Convite } from './entities/convite.entity';
import { Convidado } from './entities/convidado.entity';

export interface ConvitePublico {
  grupo: string;
  confirmadoEm: Date | null;
  convidados: { id: string; nome: string; vaiComparecer: boolean | null }[];
}

export interface ConviteAdmin {
  id: string;
  codigo: string;
  entrega: string;
  grupo: string;
  confirmadoEm: Date | null;
  link: string;
  qrCode: string | null; // data URL base64, somente para 'papel'
  convidados: { id: string; nome: string; vaiComparecer: boolean | null }[];
}

@Injectable()
export class RsvpService {
  private readonly logger = new Logger(RsvpService.name);
  private readonly frontendUrl: string;

  constructor(
    @InjectRepository(Convite)
    private readonly conviteRepo: Repository<Convite>,
    @InjectRepository(Convidado)
    private readonly convidadoRepo: Repository<Convidado>,
    private readonly config: ConfigService,
  ) {
    this.frontendUrl =
      this.config.get<string>('FRONTEND_URL') ||
      this.config.get<string>('SITE_URL') ||
      'http://localhost:3847';
  }

  /**
   * Busca convite pelo código (case-insensitive + trim).
   * Retorna null se não encontrado — o controller decide o erro genérico.
   */
  async buscarPorCodigo(codigo: string): Promise<ConvitePublico | null> {
    const normalizado = codigo.trim().toLowerCase();

    const convite = await this.conviteRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.convidados', 'con')
      .where('LOWER(c.codigo) = :codigo', { codigo: normalizado })
      .orderBy('con.created_at', 'ASC')
      .getOne();

    if (!convite) return null;

    return {
      grupo: convite.grupo,
      confirmadoEm: convite.confirmadoEm,
      convidados: convite.convidados.map((c) => ({
        id: c.id,
        nome: c.nome,
        vaiComparecer: c.vaiComparecer,
      })),
    };
  }

  /**
   * Grava as respostas de presença.
   * Valida que cada convidado_id pertence ao convite do código — ignora IDs de outros convites.
   */
  async confirmarPresenca(
    codigo: string,
    respostas: { convidadoId: string; vaiComparecer: boolean }[],
  ): Promise<void> {
    const normalizado = codigo.trim().toLowerCase();

    const convite = await this.conviteRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.convidados', 'con')
      .where('LOWER(c.codigo) = :codigo', { codigo: normalizado })
      .getOne();

    if (!convite) {
      throw new NotFoundException('Convite não encontrado');
    }

    // Mapa de IDs válidos para este convite — proteção contra IDOR
    const idsValidos = new Set(convite.convidados.map((c) => c.id));

    for (const r of respostas) {
      if (!idsValidos.has(r.convidadoId)) {
        this.logger.warn(
          `[RSVP] convidado_id ${r.convidadoId} não pertence ao convite ${codigo} — ignorado`,
        );
        continue;
      }
      await this.convidadoRepo.update(r.convidadoId, {
        vaiComparecer: r.vaiComparecer,
      });
    }

    await this.conviteRepo.update(convite.id, { confirmadoEm: new Date() });
    this.logger.log(`[RSVP] Presença confirmada: "${convite.grupo}" (${codigo})`);
  }

  /**
   * Retorna todos os convites com dados completos + QR codes.
   * Exclusivo para a rota admin.
   */
  async listarTodosAdmin(): Promise<ConviteAdmin[]> {
    const convites = await this.conviteRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.convidados', 'con')
      .orderBy('c.grupo', 'ASC')
      .addOrderBy('con.created_at', 'ASC')
      .getMany();

    return Promise.all(
      convites.map(async (c) => {
        const link = `${this.frontendUrl}/confirmar.html?c=${encodeURIComponent(c.codigo)}`;
        let qrCode: string | null = null;

        if (c.entrega === 'papel') {
          qrCode = await QRCode.toDataURL(link, {
            width: 200,
            margin: 2,
            color: { dark: '#1c1a17', light: '#ffffff' },
          });
        }

        return {
          id: c.id,
          codigo: c.codigo,
          entrega: c.entrega,
          grupo: c.grupo,
          confirmadoEm: c.confirmadoEm,
          link,
          qrCode,
          convidados: c.convidados.map((p) => ({
            id: p.id,
            nome: p.nome,
            vaiComparecer: p.vaiComparecer,
          })),
        };
      }),
    );
  }
}
