import {
  Controller,
  Post,
  Body,
  Ip,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mensagem } from './entities/mensagem.entity';
import { CriarMensagemDto } from './dto/criar-mensagem.dto';
import { NotificacoesService } from '../notificacoes/notificacoes.service';

// Formulário aberto ao público: no máximo 5 mensagens por IP a cada hora,
// o bastante para quem quer escrever de novo e pouco para quem quer spam.
const LIMITE_POR_HORA = 5;
const UMA_HORA = 60 * 60 * 1000;

@Controller('api/mensagens')
export class MensagensController {
  private readonly logger = new Logger(MensagensController.name);
  private readonly enviosPorIp = new Map<string, number[]>();

  constructor(
    @InjectRepository(Mensagem)
    private readonly repositorio: Repository<Mensagem>,
    private readonly notificacoes: NotificacoesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async criar(@Body() dto: CriarMensagemDto, @Ip() ip: string) {
    const agora = Date.now();
    const recentes = (this.enviosPorIp.get(ip) ?? []).filter(
      (t) => agora - t < UMA_HORA,
    );
    if (recentes.length >= LIMITE_POR_HORA) {
      throw new HttpException(
        'Você já enviou várias mensagens. Tente novamente mais tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.enviosPorIp.set(ip, [...recentes, agora]);

    const mensagem = await this.repositorio.save(
      this.repositorio.create({ nome: dto.nome, texto: dto.texto }),
    );
    this.logger.log(`Mensagem #${mensagem.id} recebida de ${dto.nome}`);

    this.notificacoes.enviar(`💌 Nova mensagem de ${dto.nome}`, [
      `${dto.nome} deixou uma mensagem no site:`,
      '',
      dto.texto,
    ]);

    return { success: true };
  }
}
