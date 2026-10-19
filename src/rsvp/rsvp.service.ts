import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomInt } from 'crypto';
import * as QRCode from 'qrcode';
import { ConfigService } from '@nestjs/config';
import { Convite } from './entities/convite.entity';
import { Convidado } from './entities/convidado.entity';
import { SalvarConviteDto } from './dto/salvar-convite.dto';

// Sem 0/O e 1/I/L: o código vai impresso no convite de papel e é digitado à mão
const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// `grupo` é controle interno — nunca vai na resposta pública para o convidado
export interface ConvitePublico {
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
    private readonly dataSource: DataSource,
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
        const link = `${this.frontendUrl}/confirmar/?c=${encodeURIComponent(c.codigo)}`;
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

  /** Cria um convite com as pessoas informadas. */
  async criarConvite(dto: SalvarConviteDto): Promise<void> {
    const codigo = dto.codigo || (await this.gerarCodigoLivre());
    await this.garantirCodigoLivre(codigo);

    await this.conviteRepo.save(
      this.conviteRepo.create({
        codigo,
        entrega: dto.entrega,
        grupo: dto.grupo,
        convidados: dto.convidados.map((p) =>
          this.convidadoRepo.create({ nome: p.nome }),
        ),
      }),
    );
    this.logger.log(`[Admin] Convite criado: "${dto.grupo}" (${codigo})`);
  }

  /**
   * Atualiza o convite e sincroniza a lista de pessoas: quem veio com id é
   * renomeado (e mantém a resposta), quem veio sem id é incluído e quem
   * sumiu da lista é removido.
   */
  async atualizarConvite(id: string, dto: SalvarConviteDto): Promise<void> {
    const convite = await this.conviteRepo.findOne({
      where: { id },
      relations: ['convidados'],
    });
    if (!convite) throw new NotFoundException('Convite não encontrado.');

    const codigo = dto.codigo || convite.codigo;
    if (codigo.toLowerCase() !== convite.codigo.toLowerCase()) {
      await this.garantirCodigoLivre(codigo);
    }

    const idsAtuais = new Set(convite.convidados.map((p) => p.id));
    const idsMantidos = new Set(
      dto.convidados.filter((p) => p.id && idsAtuais.has(p.id)).map((p) => p.id),
    );

    await this.dataSource.transaction(async (m) => {
      await m.update(Convite, id, {
        codigo,
        entrega: dto.entrega,
        grupo: dto.grupo,
      });

      const removidos = convite.convidados.filter((p) => !idsMantidos.has(p.id));
      if (removidos.length) {
        await m.delete(Convidado, removidos.map((p) => p.id));
      }

      for (const p of dto.convidados) {
        if (p.id && idsAtuais.has(p.id)) {
          await m.update(Convidado, p.id, { nome: p.nome });
        } else {
          await m.insert(Convidado, { conviteId: id, nome: p.nome });
        }
      }
    });
    this.logger.log(`[Admin] Convite atualizado: "${dto.grupo}" (${codigo})`);
  }

  /** Exclui o convite e todas as pessoas dele. */
  async excluirConvite(id: string): Promise<void> {
    const convite = await this.conviteRepo.findOne({ where: { id } });
    if (!convite) throw new NotFoundException('Convite não encontrado.');

    await this.dataSource.transaction(async (m) => {
      await m.delete(Convidado, { conviteId: id });
      await m.delete(Convite, id);
    });
    this.logger.log(`[Admin] Convite excluído: "${convite.grupo}" (${convite.codigo})`);
  }

  private async garantirCodigoLivre(codigo: string): Promise<void> {
    const existe = await this.conviteRepo
      .createQueryBuilder('c')
      .where('LOWER(c.codigo) = :codigo', { codigo: codigo.toLowerCase() })
      .getExists();
    if (existe) {
      throw new ConflictException(`Já existe um convite com o código ${codigo}.`);
    }
  }

  private async gerarCodigoLivre(): Promise<string> {
    for (;;) {
      const codigo = Array.from(
        { length: 6 },
        () => ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)],
      ).join('');
      const existe = await this.conviteRepo
        .createQueryBuilder('c')
        .where('LOWER(c.codigo) = :codigo', { codigo: codigo.toLowerCase() })
        .getExists();
      if (!existe) return codigo;
    }
  }
}
