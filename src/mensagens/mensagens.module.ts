import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mensagem } from './entities/mensagem.entity';
import { MensagensController } from './mensagens.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Mensagem])],
  controllers: [MensagensController],
})
export class MensagensModule {}
