import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { randomUUID } from 'crypto';

export interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  referenceId?: string;
  paymentLinkId?: string;
  isDevelopment?: boolean;
  error?: string;
}

@Injectable()
export class PagamentosService {
  private readonly logger = new Logger(PagamentosService.name);
  private readonly picpayApiUrl: string;
  private readonly checkoutApiUrl = 'https://checkout-api.picpay.com';
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly siteUrl: string;
  private readonly frontendUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private configService: ConfigService) {
    this.picpayApiUrl =
      this.configService.get<string>('PICPAY_API_URL') ||
      'https://api.picpay.com';
    this.clientId = this.configService.get<string>('PICPAY_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('PICPAY_CLIENT_SECRET');
    this.siteUrl =
      this.configService.get<string>('SITE_URL') || 'http://localhost:3847';
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || this.siteUrl;
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s margin for 5-min token)
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    this.logger.log('Obtendo novo access token do PicPay...');

    const response = await axios.post(
      `${this.checkoutApiUrl}/oauth2/token`,
      {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
    );

    this.logger.log(`Token response: ${JSON.stringify(response.data)}`);
    this.accessToken = response.data.access_token;
    const expiresIn = response.data.expires_in || 300;
    this.tokenExpiresAt = Date.now() + expiresIn * 1000;

    this.logger.log(`Access token obtido (expira em ${expiresIn}s)`);
    return this.accessToken;
  }

  async criarCobranca(
    nome: string,
    email: string,
    telefone: string,
    presenteId: string,
    presenteNome: string,
    valor: number,
  ): Promise<PaymentResponse> {
    if (!this.clientId || !this.clientSecret) {
      this.logger.warn('Credenciais PicPay não configuradas. Usando mock.');
      return this.getMockResponse();
    }

    const valorCentavos = Math.round(valor * 100);
    const merchantChargeId = `presente-${presenteId}-${randomUUID().split('-')[0]}`;

    this.logger.log(
      `Criando cobrança: ${nome} | R$${valor} (${valorCentavos}¢) | merchantChargeId: ${merchantChargeId}`,
    );

    let accessToken: string;
    try {
      accessToken = await this.getAccessToken();
    } catch (tokenError) {
      this.logger.error(
        'Erro ao obter token:',
        tokenError.response?.data || tokenError.message,
      );
      throw tokenError;
    }

    // --- Tentativa 1: Checkout Padrão (checkout-api.picpay.com/api/v1/checkout) ---
    try {
      const checkoutBody: Record<string, unknown> = {
        amount: valorCentavos,
        merchantChargeId,
        payer: {
          name: nome,
          email,
          ...(telefone ? { phone: telefone } : {}),
        },
        redirectUrl: `${this.frontendUrl}?pagamento=sucesso`,
        notificationUrl: `${this.siteUrl}/api/webhook/picpay`,
        items: [
          {
            description: `Presente de Casamento - ${presenteNome}`,
            quantity: 1,
            amount: valorCentavos,
          },
        ],
      };

      this.logger.log(
        `[Checkout API] POST ${this.checkoutApiUrl}/api/v1/checkout`,
      );
      this.logger.log(`[Checkout API] Payload: ${JSON.stringify(checkoutBody)}`);

      const response = await axios.post(
        `${this.checkoutApiUrl}/api/v1/checkout`,
        checkoutBody,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      this.logger.log(
        `[Checkout API] Resposta (${response.status}): ${JSON.stringify(response.data)}`,
      );

      const paymentUrl =
        response.data.checkoutUrl ||
        response.data.checkout_url ||
        response.data.paymentUrl ||
        response.data.payment_url ||
        response.data.link;

      return {
        success: true,
        paymentUrl,
        referenceId: merchantChargeId,
      };
    } catch (checkoutError) {
      this.logger.warn(
        `[Checkout API] Falhou (${checkoutError.response?.status}): ${JSON.stringify(checkoutError.response?.data || checkoutError.message)}`,
      );
      this.logger.log('[Checkout API] Tentando Link de Pagamento como fallback...');
    }

    // --- Tentativa 2: Link de Pagamento (api.picpay.com/paymentlink/create) ---
    const expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const paymentLinkBody = {
      name: presenteNome,
      description: `Presente de casamento: ${presenteNome} - De: ${nome}`,
      amount: valorCentavos,
      payment_methods: ['PIX', 'CREDIT_CARD', 'WALLET'],
      expiration_date: expirationDate.toISOString(),
      redirect_url: `${this.frontendUrl}?pagamento=sucesso`,
      order_number: merchantChargeId,
      details: {
        product_amount: valorCentavos,
        delivery_amount: 0,
      },
    };

    this.logger.log(
      `[Link Pagamento] POST ${this.picpayApiUrl}/paymentlink/create`,
    );
    this.logger.log(`[Link Pagamento] Payload: ${JSON.stringify(paymentLinkBody)}`);

    const linkResponse = await axios.post(
      `${this.picpayApiUrl}/paymentlink/create`,
      paymentLinkBody,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    this.logger.log(
      `[Link Pagamento] Resposta (${linkResponse.status}): ${JSON.stringify(linkResponse.data)}`,
    );

    const paymentLinkId =
      linkResponse.data.paymentLinkId ||
      linkResponse.data.payment_link_id ||
      linkResponse.data.id;
    const paymentUrl =
      linkResponse.data.link ||
      linkResponse.data.checkoutLink ||
      linkResponse.data.checkout_link;

    // paymentLinkId is PicPay's ID — used to match webhook data.charge.paymentLinkId
    return {
      success: true,
      paymentUrl,
      referenceId: paymentLinkId || merchantChargeId,
      paymentLinkId,
    };
  }

  async consultarStatus(referenceId: string): Promise<string> {
    try {
      const accessToken = await this.getAccessToken();
      const response = await axios.get(
        `${this.picpayApiUrl}/paymentlink/${referenceId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        },
      );
      return response.data.status;
    } catch (error) {
      this.logger.error(`Erro ao consultar status: ${error.message}`);
      throw error;
    }
  }

  isPicpayConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  generateMockReferenceId(): string {
    return `mock-${Date.now()}`;
  }

  private getMockResponse(): PaymentResponse {
    return {
      success: true,
      paymentUrl: 'https://picpay.com/mock-payment-link',
      referenceId: `mock-${Date.now()}`,
      isDevelopment: true,
    };
  }
}
