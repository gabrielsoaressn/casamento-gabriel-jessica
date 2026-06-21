import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

interface IpRecord {
  failCount: number;
  blockedUntil: number; // epoch ms, 0 = não bloqueado
  lastAttempt: number;  // epoch ms
}

const MAX_FALHAS       = 5;
const BLOQUEIO_MS      = 15 * 60 * 1000; // 15 minutos
const JANELA_MS        = 15 * 60 * 1000; // janela deslizante de 15 min
const CLEANUP_IDLE_MS  = 60 * 60 * 1000; // remove registros após 1h sem atividade

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly store = new Map<string, IpRecord>();

  /**
   * Verifica se o IP está bloqueado.
   * Retorna { bloqueado: true, restanteMs } ou { bloqueado: false }.
   */
  verificar(ip: string): { bloqueado: boolean; restanteMs?: number } {
    const rec = this.store.get(ip);
    if (!rec) return { bloqueado: false };

    const agora = Date.now();

    if (rec.blockedUntil > agora) {
      return { bloqueado: true, restanteMs: rec.blockedUntil - agora };
    }

    // Janela expirou — zera contador automaticamente
    if (agora - rec.lastAttempt > JANELA_MS) {
      this.store.delete(ip);
      return { bloqueado: false };
    }

    return { bloqueado: false };
  }

  /** Registra uma tentativa com código errado. */
  registrarFalha(ip: string): void {
    const agora = Date.now();
    const rec = this.store.get(ip) ?? { failCount: 0, blockedUntil: 0, lastAttempt: agora };

    // Se estava na janela, incrementa; senão reinicia
    if (agora - rec.lastAttempt > JANELA_MS) {
      rec.failCount = 1;
    } else {
      rec.failCount += 1;
    }
    rec.lastAttempt = agora;

    if (rec.failCount >= MAX_FALHAS) {
      rec.blockedUntil = agora + BLOQUEIO_MS;
      this.logger.warn(`[RateLimit] IP ${ip} bloqueado por 15 min (${rec.failCount} falhas)`);
    }

    this.store.set(ip, rec);
  }

  /** Reseta contador após sucesso — não punir quem acabou de acertar. */
  registrarSucesso(ip: string): void {
    this.store.delete(ip);
  }

  @Cron(CronExpression.EVERY_HOUR)
  limparEntradas(): void {
    const agora = Date.now();
    let removidos = 0;
    for (const [ip, rec] of this.store) {
      if (agora - rec.lastAttempt > CLEANUP_IDLE_MS) {
        this.store.delete(ip);
        removidos++;
      }
    }
    if (removidos > 0) {
      this.logger.debug(`[RateLimit] Limpeza: ${removidos} entrada(s) removida(s)`);
    }
  }
}
