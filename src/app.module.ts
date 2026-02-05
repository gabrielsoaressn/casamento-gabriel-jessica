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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(databaseConfig()),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..'),
      exclude: ['/api*', '/obrigado'],
    }),
    ScheduleModule.forRoot(),
    PresentesModule,
    PagamentosModule,
    HealthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
