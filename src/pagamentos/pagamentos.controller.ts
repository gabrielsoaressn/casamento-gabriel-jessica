import {
  Controller,
  Post,
  Body,
  Headers,
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

// Webhook do Checkout Padrão (checkout-api.picpay.com)
interface WebhookCheckout {
  type?: 'PAYMENT' | 'REFUND';
  eventDate?: string;
  merchantDocument?: string;
  id?: string;
  merchantCode?: string;
  data?: {
    // Novo formato: Checkout Padrão
    status?: 'AUTHORIZED' | 'PAID' | 'REFUNDED' | 'EXPIRED' | 'CANCELLED';
    amount?: number;
    originalAmount?: number;
    refundedAmount?: number;
    merchantChargeId?: string;
    smartCheckoutId?: string;
    paymentSource?: string;
    customer?: {
      document?: string;
      documentType?: string;
      email?: string;
      name?: string;
    };
    transactions?: unknown[];
    // Formato legado: Link de Pagamento
    transaction?: {
      status?: 'PAYED' | 'REFUNDED' | 'PARTREFUNDED';
      id?: string;
      amount?: number;
      paymentType?: string;
    };
    charge?: {
      paymentLinkId?: string;
      qrCode?: string;
      expiresAt?: string;
      amount?: number;
    };
  };
  // Formato legado direto
  event?: string;
  referenceId?: string;
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
          this.logger.log(`Presente ${presenteId} reservado para ${nome}`);
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
        this.logger.warn('API PicPay indisponível. Retornando mock.');

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
          } catch (dbError) {
            this.logger.error('Erro ao reservar presente (mock):', dbError);
          }
        }

        return {
          success: true,
          paymentUrl: 'https://picpay.com/mock-payment-link',
          referenceId: mockReferenceId,
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
  async webhook(
    @Body() body: WebhookCheckout,
    @Headers('authorization') authHeader?: string,
    @Headers('event-type') eventType?: string,
  ) {
    this.logger.log('=== Webhook PicPay Recebido ===');
    this.logger.log(`Event-Type: ${eventType} | Type: ${body.type}`);
    this.logger.log(`Body: ${JSON.stringify(body, null, 2)}`);

    // --- Formato 1: Checkout Padrão (data.merchantChargeId + data.status) ---
    if (body.data?.merchantChargeId && body.data?.status) {
      const { merchantChargeId, status } = body.data;

      this.logger.log(
        `[Checkout] merchantChargeId: ${merchantChargeId} | status: ${status}`,
      );

      try {
        switch (status) {
          case 'AUTHORIZED':
          case 'PAID':
            await this.presentesService.atualizarStatus(merchantChargeId, 'pago');
            this.logger.log(`Presente marcado como pago: ${merchantChargeId}`);
            break;
          case 'REFUNDED':
            await this.presentesService.atualizarStatus(merchantChargeId, 'cancelado');
            this.logger.log(`Presente cancelado: ${merchantChargeId}`);
            break;
          case 'EXPIRED':
          case 'CANCELLED':
            await this.presentesService.atualizarStatus(merchantChargeId, 'expirado');
            this.logger.log(`Presente expirado: ${merchantChargeId}`);
            break;
          default:
            this.logger.log(`Status não tratado: ${status}`);
        }
      } catch (dbError) {
        this.logger.error('Erro ao atualizar status:', dbError);
      }

      return { received: true };
    }

    // --- Formato 2: Link de Pagamento (data.transaction + data.charge) ---
    if (body.data?.transaction && body.data?.charge) {
      const { transaction, charge } = body.data;
      const paymentLinkId = charge.paymentLinkId;
      const transactionStatus = transaction.status;

      this.logger.log(
        `[Link Pag] paymentLinkId: ${paymentLinkId} | status: ${transactionStatus}`,
      );

      if (paymentLinkId) {
        try {
          switch (transactionStatus) {
            case 'PAYED':
              await this.presentesService.atualizarStatus(paymentLinkId, 'pago');
              this.logger.log(`Presente marcado como pago: ${paymentLinkId}`);
              break;
            case 'REFUNDED':
              await this.presentesService.atualizarStatus(paymentLinkId, 'cancelado');
              this.logger.log(`Presente cancelado: ${paymentLinkId}`);
              break;
            case 'PARTREFUNDED':
              this.logger.log(`Estorno parcial registrado: ${paymentLinkId}`);
              break;
            default:
              this.logger.log(`Status não tratado: ${transactionStatus}`);
          }
        } catch (dbError) {
          this.logger.error('Erro ao atualizar status:', dbError);
        }
      }

      return { received: true };
    }

    // --- Formato 3: Legado (referenceId + event) ---
    if (body.referenceId) {
      this.logger.log(
        `[Legado] referenceId: ${body.referenceId} | event: ${body.event}`,
      );

      try {
        const status = await this.pagamentosService.consultarStatus(
          body.referenceId,
        );
        this.logger.log(`Status consultado: ${status}`);

        switch (status?.toLowerCase()) {
          case 'paid':
          case 'payed':
            await this.presentesService.atualizarStatus(body.referenceId, 'pago');
            break;
          case 'expired':
            await this.presentesService.atualizarStatus(body.referenceId, 'expirado');
            break;
          case 'refunded':
          case 'chargeback':
            await this.presentesService.atualizarStatus(body.referenceId, 'cancelado');
            break;
          default:
            this.logger.log(`Status não mapeado: ${status}`);
        }
      } catch (error) {
        this.logger.error(`Erro ao processar webhook legado: ${error.message}`);
      }

      return { received: true };
    }

    this.logger.warn('Webhook recebido em formato desconhecido');
    return { received: true };
  }
}
