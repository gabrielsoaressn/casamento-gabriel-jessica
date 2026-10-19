import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  IsUUID,
  ValidateNested,
  MaxLength,
  Matches,
  ArrayMinSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

class ConvidadoDto {
  // Sem id: pessoa nova. Com id: pessoa existente (mantém a resposta do RSVP)
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(trim)
  nome: string;
}

export class SalvarConviteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(trim)
  grupo: string;

  @IsIn(['papel', 'digital'])
  entrega: string;

  // Vazio ou ausente: o servidor gera um código novo
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9-]*$/, {
    message: 'O código só pode ter letras, números e hífen.',
  })
  @Transform(trim)
  codigo?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'O convite precisa de pelo menos um convidado.' })
  @ValidateNested({ each: true })
  @Type(() => ConvidadoDto)
  convidados: ConvidadoDto[];
}
