import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Ip,
  HttpCode,
  HttpStatus,
  HttpException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RsvpService } from './rsvp.service';
import { RateLimiterService } from './rate-limiter.service';
import { VerificarDto } from './dto/verificar.dto';
import { ConfirmarDto } from './dto/confirmar.dto';

@Controller('api/rsvp')
export class RsvpController {
  private readonly logger = new Logger(RsvpController.name);

  constructor(
    private readonly rsvpService: RsvpService,
    private readonly rateLimiter: RateLimiterService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Busca o convite pelo código secreto.
   * Sujeito a rate limiting por IP: 5 erros → bloqueio de 15 min.
   * Retorna erro genérico para código inválido (não revela se existe ou não).
   */
  @Post('verificar')
  @HttpCode(HttpStatus.OK)
  async verificar(@Body() dto: VerificarDto, @Ip() ip: string) {
    const check = this.rateLimiter.verificar(ip);
    if (check.bloqueado) {
      const min = Math.ceil((check.restanteMs ?? 0) / 60000);
      throw new HttpException(
        `Muitas tentativas. Tente novamente em ${min} minuto(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const convite = await this.rsvpService.buscarPorCodigo(dto.codigo);

    if (!convite) {
      this.rateLimiter.registrarFalha(ip);
      // Erro genérico — não revela se o código existe
      throw new HttpException(
        'Convite não encontrado. Verifique o código e tente novamente.',
        HttpStatus.NOT_FOUND,
      );
    }

    this.rateLimiter.registrarSucesso(ip);
    return convite;
  }

  /**
   * Grava a confirmação de presença.
   * O código é re-validado no service; IDs de outros convites são ignorados silenciosamente.
   */
  @Post('confirmar')
  @HttpCode(HttpStatus.OK)
  async confirmar(@Body() dto: ConfirmarDto, @Ip() ip: string) {
    const check = this.rateLimiter.verificar(ip);
    if (check.bloqueado) {
      const min = Math.ceil((check.restanteMs ?? 0) / 60000);
      throw new HttpException(
        `Muitas tentativas. Tente novamente em ${min} minuto(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    try {
      await this.rsvpService.confirmarPresenca(dto.codigo, dto.respostas);
      return { success: true };
    } catch (e) {
      // Código inválido na confirmação: registra falha e retorna genérico
      this.rateLimiter.registrarFalha(ip);
      throw new HttpException(
        'Convite não encontrado. Verifique o código e tente novamente.',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}

@Controller('api/admin')
export class AdminRsvpController {
  private readonly logger = new Logger(AdminRsvpController.name);

  constructor(
    private readonly rsvpService: RsvpService,
    private readonly config: ConfigService,
  ) {}

  /** Lista todos os convites. Requer header Authorization: Bearer ADMIN_TOKEN. */
  @Get('convites')
  async listarConvites(@Headers('authorization') authHeader?: string) {
    const adminToken = this.config.get<string>('ADMIN_TOKEN');
    if (!adminToken) {
      throw new HttpException(
        'ADMIN_TOKEN não configurado no servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (token !== adminToken) {
      throw new UnauthorizedException('Token de administrador inválido.');
    }

    return this.rsvpService.listarTodosAdmin();
  }
}
