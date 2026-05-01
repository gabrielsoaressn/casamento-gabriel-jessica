import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PagamentosService } from './pagamentos.service';
import { PresentesService } from '../presentes/presentes.service';

// Webhook do Mercado Pago (notification v1)
// Docs: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
interface WebhookMercadoPago {
  id?: number | string;
  live_mode?: boolean;
  type?: string; // 'payment' | 'subscription_preapproval' | 'merchant_order' | ...
  date_created?: string;
  application_id?: number | string;
  user_id?: number | string;
  version?: number;
  api_version?: string;
  action?: string; // ex: 'payment.created', 'payment.updated'
  data?: { id?: string | number };
}

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
      // Mercado Pago é o gateway oficial. PicPay foi descontinuado mas o
      // método antigo (criarCobranca) e o webhook /api/webhook/picpay
      // ficaram preservados no service caso seja necessário reativar.
      const result = await this.pagamentosService.criarPreferenciaMercadoPago(
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
        'Erro ao criar cobrança Mercado Pago:',
        error.response?.data || error.message,
      );

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

  /**
   * Webhook do Mercado Pago.
   * Rota completa: POST /api/webhook/mercadopago
   *
   * Estratégia:
   *  1. Responder 200 OK imediatamente (MP exige resposta < 22s, senão re-tenta).
   *  2. Disparar o processamento em "fire-and-forget" — não usamos await na
   *     promessa para não bloquear a resposta.
   *  3. No processamento, consultamos a API oficial do MP usando nosso
   *     Access Token para confirmar o status real do pagamento (a notificação
   *     em si só carrega o id; a fonte da verdade é a consulta autenticada).
   */
  @Post('webhook/mercadopago')
  @HttpCode(HttpStatus.OK)
  async webhookMercadoPago(
    @Body() body: WebhookMercadoPago,
    @Headers('x-request-id') xRequestId?: string,
  ) {
    this.logger.log('=== Webhook Mercado Pago Recebido ===');
    this.logger.log(
      `x-request-id: ${xRequestId} | type: ${body?.type} | action: ${body?.action} | data.id: ${body?.data?.id}`,
    );

    const paymentId = body?.data?.id ? String(body.data.id) : null;
    const type = body?.type;

    // Só fazemos a consulta segura para eventos de pagamento.
    // Outros tópicos (merchant_order, subscription_preapproval, etc.) são
    // apenas registrados no log; o MP continua recebendo 200 OK.
    if (type === 'payment' && paymentId) {
      // fire-and-forget: já vamos retornar 200 logo abaixo.
      this.processarPagamentoMercadoPago(paymentId).catch((err) => {
        this.logger.error(
          `[MP Webhook] falha ao processar payment ${paymentId}: ${err.message}`,
        );
      });
    } else {
      this.logger.log(
        `[MP Webhook] evento não-payment ignorado para processamento: type=${type}`,
      );
    }

    return { received: true };
  }

  /**
   * Validação anti-fraude do webhook do Mercado Pago.
   * Consulta a API real do MP com nosso Access Token e, se o pagamento estiver
   * realmente "approved", aciona a atualização do presente/cota no banco.
   */
  private async processarPagamentoMercadoPago(paymentId: string): Promise<void> {
    const payment =
      await this.pagamentosService.consultarPagamentoMercadoPago(paymentId);

    const status = payment?.status;
    const externalReference = payment?.external_reference;

    this.logger.log(
      `[MP Webhook] payment ${paymentId} → status=${status} | external_reference=${externalReference}`,
    );

    if (status === 'approved') {
      // ================================================================
      // ATUALIZAÇÃO DO PRESENTE/COTA NO BANCO
      // ----------------------------------------------------------------
      // Convenção do projeto (mesma usada pelo webhook PicPay logo acima):
      //   await this.presentesService.atualizarStatus(referenceId, 'pago')
      //
      // O `referenceId` vem do campo `external_reference` que precisa ser
      // enviado quando criamos a Preference do MP — usar o MESMO valor que
      // gravamos em `presentes_reservados.referenceId` ao reservar o presente
      // (veja PagamentosController.criarCobranca → presentesService.reservar).
      //
      // Ex.: ao criar a preference no MP, mandar:
      //   { external_reference: orderNumber, ... }
      // onde `orderNumber` é o referenceId persistido no banco.
      // ================================================================
      if (!externalReference) {
        this.logger.warn(
          `[MP Webhook] payment ${paymentId} approved sem external_reference — ` +
            `verifique se a Preference está sendo criada com external_reference = referenceId.`,
        );
        return;
      }

      try {
        const atualizado = await this.presentesService.atualizarStatus(
          externalReference,
          'pago',
        );
        if (atualizado) {
          this.logger.log(
            `[MP Webhook] presente marcado como pago: ${externalReference}`,
          );
        } else {
          this.logger.warn(
            `[MP Webhook] external_reference ${externalReference} não encontrado em presentes_reservados`,
          );
        }
      } catch (dbError) {
        this.logger.error(
          `[MP Webhook] erro ao atualizar status no banco: ${dbError.message}`,
        );
      }
      return;
    }

    // Outros status finais que podem demandar tratamento futuro:
    //   - 'refunded' / 'charged_back': estornar/cancelar a reserva.
    //       await this.presentesService.atualizarStatus(externalReference, 'cancelado');
    //   - 'cancelled' / 'rejected': liberar o presente para outro convidado.
    //       await this.presentesService.atualizarStatus(externalReference, 'expirado');
    // Por ora apenas registramos no log para evitar mudanças destrutivas em produção.
    this.logger.log(
      `[MP Webhook] status "${status}" não acionou update no banco (somente 'approved' faz update hoje)`,
    );
  }
}
