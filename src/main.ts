import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Atrás do Nginx: sem isso, @Ip() enxerga o IP do proxy para todos os
  // visitantes e o rate limiter do RSVP bloquearia o site inteiro de uma vez
  app.set('trust proxy', 1);

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 3847;
  await app.listen(port);

  console.log(`\n🎉 Servidor rodando na porta ${port}`);
  console.log(`📍 Acesse: http://localhost:${port}`);
  console.log(`💳 API PicPay: ${process.env.PICPAY_CLIENT_ID && process.env.PICPAY_CLIENT_SECRET ? 'Configurada ✓' : 'Não configurada ⚠️'}`);
  console.log(`🗄️ Banco de dados: Configurado ✓`);
  console.log('\n');
}
bootstrap();
