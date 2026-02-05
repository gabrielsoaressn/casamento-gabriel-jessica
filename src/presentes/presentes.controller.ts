import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { PresentesService } from './presentes.service';

@Controller('api')
export class PresentesController {
  constructor(private readonly presentesService: PresentesService) {}

  @Get('presentes-reservados')
  async listar() {
    try {
      const presentes = await this.presentesService.listarReservados();
      return {
        success: true,
        presentes: presentes.map((p) => ({
          presenteId: p.presenteId,
          status: p.status,
        })),
      };
    } catch (error) {
      console.error('Erro ao buscar presentes reservados:', error);
      throw new HttpException(
        {
          error: 'Erro ao buscar presentes reservados',
          presentes: [],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
