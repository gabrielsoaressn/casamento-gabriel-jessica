import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('api')
export class HealthController {
  constructor(private configService: ConfigService) {}

  @Get('health')
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      picpayConfigured: !!(
        this.configService.get<string>('PICPAY_CLIENT_ID') &&
        this.configService.get<string>('PICPAY_CLIENT_SECRET')
      ),
    };
  }
}
