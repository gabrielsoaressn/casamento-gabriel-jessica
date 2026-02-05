import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresentesController } from './presentes.controller';
import { PresentesService } from './presentes.service';
import { PresenteReservado } from './entities/presente-reservado.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PresenteReservado])],
  controllers: [PresentesController],
  providers: [PresentesService],
  exports: [PresentesService],
})
export class PresentesModule {}
