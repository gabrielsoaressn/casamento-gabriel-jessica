import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  referenceId?: string;
  qrcode?: {
    content: string;
    base64: string;
  };
  isDevelopment?: boolean;
  error?: string;
}

@Injectable()
export class PagamentosService {
  private readonly logger = new Logger(PagamentosService.name);
  private readonly picpayApiUrl: string;
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
    // Retorna token em cache se ainda válido (com 5 min de margem)
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 300000) {
      return this.accessToken;
    }

    this.logger.log('Obtendo novo access token do PicPay...');

    try {
      const response = await axios.post(
        `${this.picpayApiUrl}/oauth2/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.accessToken = response.data.access_token;
      // Token geralmente expira em 1 hora (3600 segundos)
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiresAt = Date.now() + expiresIn * 1000;

      this.logger.log('Access token obtido com sucesso');
      return this.accessToken;
    } catch (error) {
      this.logger.error(
        'Erro ao obter access token:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async criarCobranca(
    nome: string,
    email: string,
    telefone: string,
    presenteId: string,
    presenteNome: string,
    valor: number,
  ): Promise<PaymentResponse> {
    const referenceId = `presente-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Verificar se as credenciais estão configuradas
    if (!this.clientId || !this.clientSecret) {
      this.logger.warn(
        'Credenciais do PicPay não configuradas. Retornando mock para desenvolvimento.',
      );
      return this.getMockResponse();
    }

    const paymentData = {
      referenceId,
      callbackUrl: `${this.siteUrl}/api/webhook/picpay`,
      returnUrl: `${this.frontendUrl}?pagamento=sucesso`,
      value: valor,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      buyer: {
        firstName: nome.split(' ')[0],
        lastName: nome.split(' ').slice(1).join(' ') || nome.split(' ')[0],
        document: '00000000000',
        email,
        phone: telefone || '+5500000000000',
      },
      additionalInfo: [
        { key: 'presenteId', value: presenteId },
        { key: 'presenteNome', value: presenteNome },
      ],
    };

    this.logger.log(`Criando cobrança no PicPay para: ${nome} - R$ ${valor}`);

    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post(
        `${this.picpayApiUrl}/ecommerce/public/payments`,
        paymentData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      this.logger.log(`Cobrança criada com sucesso: ${response.data.referenceId}`);

      return {
        success: true,
        paymentUrl: response.data.paymentUrl,
        referenceId: response.data.referenceId,
        qrcode: response.data.qrcode,
      };
    } catch (error) {
      this.logger.error(
        'Erro ao criar cobrança:',
        error.response?.data || error.message,
      );

      if (error.code === 'ECONNREFUSED') {
        return this.getMockResponse();
      }

      throw error;
    }
  }

  async consultarStatus(referenceId: string): Promise<string> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `${this.picpayApiUrl}/ecommerce/public/payments/${referenceId}/status`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
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

  generateReferenceId(): string {
    return `presente-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateMockReferenceId(): string {
    return `mock-${Date.now()}`;
  }

  private getMockResponse(): PaymentResponse {
    return {
      success: true,
      paymentUrl: 'https://picpay.com/mock-payment-link',
      referenceId: `mock-${Date.now()}`,
      qrcode: {
        content: 'mock-qrcode',
        base64: 'data:image/png;base64,mock',
      },
      isDevelopment: true,
    };
  }
}
