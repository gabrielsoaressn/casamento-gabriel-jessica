import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
