import {
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Exige o header Authorization: Bearer ADMIN_TOKEN nas rotas do painel. */
export function autorizarAdmin(config: ConfigService, authHeader?: string) {
  const adminToken = config.get<string>('ADMIN_TOKEN');
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
}
