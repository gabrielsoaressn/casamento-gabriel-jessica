import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Avisos por e-mail para os noivos: checkout aberto, presente pago e
 * mensagens deixadas no site.
 *
 * Sem SMTP_USER/SMTP_PASS no .env o serviço só registra no log — o site
 * continua funcionando, apenas sem os avisos.
 */
@Injectable()
export class NotificacoesService {
  private readonly logger = new Logger(NotificacoesService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly remetente: string;
  private readonly destinatario: string;

  constructor(config: ConfigService) {
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    const port = Number(config.get<string>('SMTP_PORT')) || 465;

    this.remetente = user ?? '';
    this.destinatario = config.get<string>('EMAIL_NOTIFICACOES') ?? '';
    this.transporter =
      user && pass && this.destinatario
        ? nodemailer.createTransport({
            host: config.get<string>('SMTP_HOST') || 'smtp.gmail.com',
            port,
            secure: port === 465,
            auth: { user, pass },
          })
        : null;

    if (!this.transporter) {
      this.logger.warn(
        'SMTP_USER / SMTP_PASS / EMAIL_NOTIFICACOES não configurados — avisos por e-mail desligados',
      );
    }
  }

  /**
   * Nunca lança: um e-mail que falha não pode derrubar o checkout nem o
   * webhook. Quem chama pode usar sem await.
   */
  async enviar(assunto: string, linhas: string[]): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[e-mail desligado] ${assunto}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"Site do Casamento" <${this.remetente}>`,
        to: this.destinatario,
        subject: assunto,
        text: linhas.join('\n'),
      });
      this.logger.log(`E-mail enviado: ${assunto}`);
    } catch (error) {
      this.logger.error(`Falha ao enviar e-mail "${assunto}": ${error.message}`);
    }
  }
}
