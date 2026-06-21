import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
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

  /**
   * Consultado pelo frontend em polling após retorno de pagamento Pix pendente.
   * Retorna apenas o status — sem expor dados do convidado.
   * O referenceId tem entropia suficiente (UUID fragment) para não ser enumerável.
   */
  @Get('status-pagamento')
  async statusPagamento(@Query('referenceId') referenceId: string) {
    if (!referenceId) {
      throw new HttpException('referenceId obrigatório', HttpStatus.BAD_REQUEST);
    }
    const status =
      await this.presentesService.buscarStatusPorReferenceId(referenceId);
    if (status === null) {
      throw new HttpException('Referência não encontrada', HttpStatus.NOT_FOUND);
    }
    return { status };
  }

  // Alias usado pelo frontend e pelo prompt como /api/presentes
  @Get('presentes')
  async listarSimplificado() {
    try {
      const presentes = await this.presentesService.listarReservados();
      return presentes.map((p) => ({
        presente_id: p.presenteId,
        status: p.status,
      }));
    } catch (error) {
      console.error('Erro ao buscar presentes:', error);
      return [];
    }
  }
}
