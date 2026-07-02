import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';

import { databaseConfig } from './config/database.config';
import { AppController } from './app.controller';
import { PresentesModule } from './presentes/presentes.module';
import { PagamentosModule } from './pagamentos/pagamentos.module';
import { HealthModule } from './health/health.module';
import { RsvpModule } from './rsvp/rsvp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(databaseConfig()),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..'),
      // Sintaxe do path-to-regexp v8 (Express 5): '/api*' quebrava com
      // PathError e derrubava qualquer requisição 404 com erro 500
      exclude: ['/api/{*path}', '/obrigado', '/confirmar/{*path}'],
    }),
    ScheduleModule.forRoot(),
    PresentesModule,
    PagamentosModule,
    HealthModule,
    RsvpModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
