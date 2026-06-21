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

  // Nova API OAuth2 (PicPay Business — Link de Pagamento)
  private readonly checkoutApiUrl = 'https://checkout-api.picpay.com';
  private readonly paymentLinkEndpoint = 'https://api.picpay.com/paymentlink/create';

  // API legada (PicPay Ecommerce — x-picpay-token)
  private readonly ecommerceApiUrl = 'https://appws.picpay.com/ecommerce/public/payments';

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly picpayToken: string; // legado x-picpay-token
  private readonly siteUrl: string;
  private readonly frontendUrl: string;

  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('PICPAY_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('PICPAY_CLIENT_SECRET');
    this.picpayToken = this.configService.get<string>('PICPAY_TOKEN');
    this.siteUrl =
      this.configService.get<string>('SITE_URL') || 'http://localhost:3847';
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || this.siteUrl;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    this.logger.log('Obtendo access token OAuth2 do PicPay...');

    const response = await axios.post(
      `${this.checkoutApiUrl}/oauth2/token`,
      {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      },
      { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } },
    );

    this.accessToken = response.data.access_token;
    const expiresIn = response.data.expires_in || 300;
    this.tokenExpiresAt = Date.now() + expiresIn * 1000;
    this.logger.log(`Token OAuth2 obtido (expira em ${expiresIn}s)`);
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
    const valorCentavos = Math.round(valor * 100);
    const orderNumber = `presente-${presenteId}-${randomUUID().split('-')[0]}`;

    this.logger.log(`Criando cobrança: ${nome} | R$${valor} (${valorCentavos}¢) | order: ${orderNumber}`);

    // --- Estratégia 1: Nova API OAuth2 (p2b.paymentlink.transactional) ---
    if (this.clientId && this.clientSecret) {
      try {
        const token = await this.getAccessToken();

        const body = {
          name: `Presente - ${presenteNome}`,
          description: `Presente de casamento Gabriel & Jessica - ${presenteNome}`,
          amount: valorCentavos,
          payment_methods: ['BRCODE', 'CREDIT_CARD'],
          payment_brcode_arrangements: ['PIX', 'PICPAY'],
          card_max_installment_number: 1,
          max_payment_quantity: 1,
          details: {
            product_amount: valorCentavos,
            delivery_amount: 0,
            order_number: orderNumber,
            redirect_url: `${this.frontendUrl}/?pagamento=sucesso`,
          },
        };

        this.logger.log(`[OAuth2 API] POST ${this.paymentLinkEndpoint}`);
        this.logger.log(`[OAuth2 API] Body: ${JSON.stringify(body)}`);

        const response = await axios.post(this.paymentLinkEndpoint, body, {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          timeout: 15000,
        });

        this.logger.log(`[OAuth2 API] Resposta (${response.status}): ${JSON.stringify(response.data)}`);

        const paymentUrl = response.data.link || response.data.deeplink;
        const paymentLinkId = response.data.txid || response.data.paymentLinkId || orderNumber;

        return { success: true, paymentUrl, referenceId: paymentLinkId, paymentLinkId };
      } catch (e) {
        const status = e.response?.status;
        const data = e.response?.data;
        const isWaf = status === 403 && typeof data === 'string' && data.includes('<html');

        this.logger.warn(
          `[OAuth2 API] Falhou (${status}${isWaf ? ' WAF' : ''}): ${isWaf ? 'IP bloqueado temporariamente' : JSON.stringify(data || e.message)}`,
        );
        this.logger.log('[OAuth2 API] Tentando API legada como fallback...');
      }
    }

    // --- Estratégia 2: API legada (x-picpay-token) ---
    if (this.picpayToken) {
      return this.criarCobrancaLegado(nome, email, telefone, presenteId, presenteNome, valor, orderNumber);
    }

    // Nenhuma credencial funcionou
    throw new Error('Nenhuma integração PicPay disponível. Configure PICPAY_CLIENT_ID/SECRET ou PICPAY_TOKEN no .env.');
  }

  private async criarCobrancaLegado(
    nome: string,
    email: string,
    telefone: string,
    presenteId: string,
    presenteNome: string,
    valor: number,
    referenceId: string,
  ): Promise<PaymentResponse> {
    const parts = nome.trim().split(' ');
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || firstName;

    const body = {
      referenceId,
      callbackUrl: `${this.siteUrl}/api/webhook/picpay`,
      returnUrl: `${this.frontendUrl}/?pagamento=sucesso`,
      value: valor,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      buyer: {
        firstName,
        lastName,
        document: '00000000000',
        email,
        phone: telefone || '+5500000000000',
      },
      additionalInfo: [
        { key: 'presenteId', value: presenteId },
        { key: 'presenteNome', value: presenteNome },
      ],
    };

    this.logger.log(`[Legado API] POST ${this.ecommerceApiUrl}`);
    this.logger.log(`[Legado API] Body: ${JSON.stringify(body)}`);

    const response = await axios.post(this.ecommerceApiUrl, body, {
      headers: {
        'x-picpay-token': this.picpayToken,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 15000,
    });

    this.logger.log(`[Legado API] Resposta (${response.status}): ${JSON.stringify(response.data)}`);

    return {
      success: true,
      paymentUrl: response.data.paymentUrl,
      referenceId,
    };
  }

  async consultarStatus(referenceId: string): Promise<string> {
    if (this.clientId && this.clientSecret) {
      try {
        const token = await this.getAccessToken();
        const r = await axios.get(
          `https://api.picpay.com/paymentlink/${referenceId}`,
          { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
        );
        return r.data.status;
      } catch (e) {
        this.logger.warn(`[OAuth2] Consulta falhou: ${e.message}`);
      }
    }
    throw new Error('Não foi possível consultar status do pagamento.');
  }

  /**
   * Cria uma Preference no Mercado Pago (Checkout Pro) e devolve a URL
   * de pagamento. Chamada pelo POST /api/criar-cobranca.
   *
   * Aceita Pix, cartão de crédito (até 12x) e boleto — todos os meios
   * habilitados na conta do MP.
   *
   * Docs: https://www.mercadopago.com.br/developers/pt/reference/preferences/_checkout_preferences/post
   */
  async criarPreferenciaMercadoPago(
    nome: string,
    email: string,
    telefone: string | undefined,
    presenteId: string,
    presenteNome: string,
    valor: number,
  ): Promise<PaymentResponse> {
    const token = this.configService.get<string>('MERCADO_PAGO_ACCESS_TOKEN');
    if (!token) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN não configurado no .env');
    }

    // Identificador único — o MESMO valor é gravado em presentes_reservados.referenceId
    // e enviado ao MP como external_reference. O webhook usa isso para casar
    // o pagamento aprovado com a reserva no banco.
    const referenceId = `presente-${presenteId}-${randomUUID().split('-')[0]}`;

    const [firstName, ...lastNameParts] = nome.trim().split(' ');
    const lastName = lastNameParts.join(' ') || firstName;

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const body = {
      items: [
        {
          id: presenteId,
          title: `Presente - ${presenteNome}`,
          description: `Presente de casamento Gabriel & Jéssica`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(valor.toFixed(2)),
        },
      ],
      payer: {
        name: firstName,
        surname: lastName,
        email,
        ...(telefone
          ? {
              phone: {
                area_code: telefone.replace(/\D/g, '').slice(0, 2) || '00',
                number: telefone.replace(/\D/g, '').slice(2) || '000000000',
              },
            }
          : {}),
      },
      payment_methods: {
        installments: 12,
        excluded_payment_types: [], // Pix + cartão + boleto, todos habilitados
      },
      back_urls: {
        success: `${this.frontendUrl}/?pagamento=sucesso`,
        pending: `${this.frontendUrl}/?pagamento=pendente`,
        failure: `${this.frontendUrl}/?pagamento=falha`,
      },
      auto_return: 'all',
      external_reference: referenceId,
      notification_url: `${this.siteUrl}/api/webhook/mercadopago`,
      statement_descriptor: 'Casamento Gabriel & Jessica',
      expires: true,
      expiration_date_to: expiresAt,
    };

    this.logger.log(
      `[MP] criando Preference para ${nome} | R$${valor} | ref=${referenceId}`,
    );

    const response = await axios.post(
      'https://api.mercadopago.com/checkout/preferences',
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 15000,
      },
    );

    const initPoint = response.data.init_point || response.data.sandbox_init_point;
    if (!initPoint) {
      throw new Error('Mercado Pago não retornou init_point');
    }

    this.logger.log(
      `[MP] Preference criada id=${response.data.id} | init_point ok`,
    );

    return {
      success: true,
      paymentUrl: initPoint,
      referenceId,
    };
  }

  /**
   * Consulta o status real de um pagamento na API do Mercado Pago.
   * Usada pelo webhook /api/webhook/mercadopago para validar que a notificação
   * é legítima (a notificação só nos diz "houve algo no id X" — a fonte da
   * verdade é esta consulta autenticada com nosso Access Token).
   *
   * Docs: https://www.mercadopago.com.br/developers/pt/reference/payments/_payments_id/get
   */
  async consultarPagamentoMercadoPago(paymentId: string): Promise<{
    id: number | string;
    status: string;
    status_detail?: string;
    external_reference?: string;
    transaction_amount?: number;
    payer?: { email?: string };
    [key: string]: unknown;
  }> {
    const token = this.configService.get<string>('MERCADO_PAGO_ACCESS_TOKEN');
    if (!token) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN não configurado no .env');
    }

    const r = await axios.get(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        timeout: 10000,
      },
    );
    return r.data;
  }

  isPicpayConfigured(): boolean {
    return !!(this.clientId && this.clientSecret) || !!this.picpayToken;
  }

  generateMockReferenceId(): string {
    return `mock-${Date.now()}`;
  }
}
