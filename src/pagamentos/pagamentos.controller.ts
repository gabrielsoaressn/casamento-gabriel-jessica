import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PagamentosService } from './pagamentos.service';
import { PresentesService } from '../presentes/presentes.service';

interface CriarCobrancaBody {
  nome: string;
  email: string;
  telefone?: string;
  presenteId: string;
  presenteNome: string;
  valor: number;
}

interface WebhookBody {
  event?: string;
  data?: any;
  referenceId?: string;
  authorizationId?: string;
}

@Controller('api')
export class PagamentosController {
  private readonly logger = new Logger(PagamentosController.name);

  constructor(
    private readonly pagamentosService: PagamentosService,
    private readonly presentesService: PresentesService,
  ) {}

  @Post('criar-cobranca')
  async criarCobranca(@Body() body: CriarCobrancaBody) {
    const { nome, email, telefone, presenteId, presenteNome, valor } = body;

    if (!nome || !email || !valor) {
      throw new HttpException('Dados incompletos', HttpStatus.BAD_REQUEST);
    }

    if (valor < 10) {
      throw new HttpException(
        'Valor mínimo é R$ 10,00',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (presenteId !== 'personalizado') {
      const disponivel =
        await this.presentesService.verificarDisponibilidade(presenteId);
      if (!disponivel) {
        throw new HttpException(
          {
            error: 'Este presente já foi reservado por outro convidado',
            message: 'Por favor, escolha outro presente da lista',
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    try {
      const result = await this.pagamentosService.criarCobranca(
        nome,
        email,
        telefone,
        presenteId,
        presenteNome,
        valor,
      );

      if (presenteId !== 'personalizado') {
        try {
          await this.presentesService.reservar(
            presenteId,
            presenteNome,
            valor,
            nome,
            email,
            telefone,
            result.referenceId,
          );
          this.logger.log(`✓ Presente ${presenteId} reservado para ${nome}`);
        } catch (dbError) {
          this.logger.error('Erro ao reservar presente no banco:', dbError);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(
        'Erro ao criar cobrança:',
        error.response?.data || error.message,
      );

      if (
        !this.pagamentosService.isPicpayConfigured() ||
        error.code === 'ECONNREFUSED'
      ) {
        this.logger.warn(
          'API do PicPay não configurada. Retornando mock para desenvolvimento.',
        );

        const mockReferenceId = this.pagamentosService.generateMockReferenceId();

        if (presenteId !== 'personalizado') {
          try {
            await this.presentesService.reservar(
              presenteId,
              presenteNome,
              valor,
              nome,
              email,
              telefone,
              mockReferenceId,
            );
            this.logger.log(`✓ Presente ${presenteId} reservado (modo dev)`);
          } catch (dbError) {
            this.logger.error('Erro ao reservar presente:', dbError);
          }
        }

        return {
          success: true,
          paymentUrl: 'https://picpay.com/mock-payment-link',
          referenceId: mockReferenceId,
          qrcode: {
            content: 'mock-qrcode',
            base64: 'data:image/png;base64,mock',
          },
          isDevelopment: true,
        };
      }

      throw new HttpException(
        {
          error: 'Erro ao processar pagamento',
          message: error.response?.data?.message || error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('webhook/picpay')
  async webhook(@Body() body: WebhookBody) {
    const { event, data, referenceId, authorizationId } = body;

    this.logger.log(`Webhook recebido: ${event} ${JSON.stringify(data)}`);

    if (referenceId) {
      this.logger.log(`Notificação de pagamento recebida para: ${referenceId}`);

      try {
        const status =
          await this.pagamentosService.consultarStatus(referenceId);
        this.logger.log(`Status do pagamento ${referenceId}: ${status}`);

        switch (status) {
          case 'paid':
            this.logger.log(`✓ Pagamento confirmado: ${referenceId}`);
            try {
              await this.presentesService.atualizarStatus(referenceId, 'pago');
              this.logger.log(`✓ Status do presente atualizado para 'pago'`);
            } catch (dbError) {
              this.logger.error('Erro ao atualizar status:', dbError);
            }
            break;

          case 'analysis':
            this.logger.log(`⏳ Pagamento em análise: ${referenceId}`);
            break;

          case 'expired':
            this.logger.log(`⏰ Pagamento expirado: ${referenceId}`);
            try {
              await this.presentesService.atualizarStatus(
                referenceId,
                'expirado',
              );
            } catch (dbError) {
              this.logger.error('Erro ao atualizar status:', dbError);
            }
            break;

          case 'refunded':
            this.logger.log(`↩️ Pagamento estornado: ${referenceId}`);
            try {
              await this.presentesService.atualizarStatus(
                referenceId,
                'cancelado',
              );
            } catch (dbError) {
              this.logger.error('Erro ao atualizar status:', dbError);
            }
            break;

          case 'chargeback':
            this.logger.log(`⚠️ Chargeback: ${referenceId}`);
            try {
              await this.presentesService.atualizarStatus(
                referenceId,
                'cancelado',
              );
            } catch (dbError) {
              this.logger.error('Erro ao atualizar status:', dbError);
            }
            break;

          default:
            this.logger.log(`Status desconhecido: ${status}`);
        }
      } catch (error) {
        this.logger.error(`Erro ao consultar status: ${error.message}`);
      }
    }

    return { received: true };
  }
}
