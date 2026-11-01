import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mensagem } from './entities/mensagem.entity';
import {
  MensagensController,
  AdminMensagensController,
} from './mensagens.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Mensagem])],
  controllers: [MensagensController, AdminMensagensController],
})
export class MensagensModule {}
