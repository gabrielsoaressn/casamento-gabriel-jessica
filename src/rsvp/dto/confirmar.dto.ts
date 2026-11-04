import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsBoolean,
  ValidateNested,
  MaxLength,
  IsUUID,
  IsOptional,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

class RespostaDto {
  @IsUUID()
  convidadoId: string;

  @IsBoolean()
  vaiComparecer: boolean;

  // true = vai só à cerimônia, sem a recepção (ignorado quando não vai)
  @IsOptional()
  @IsBoolean()
  apenasCerimonia?: boolean;
}

export class ConfirmarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  codigo: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RespostaDto)
  respostas: RespostaDto[];
}
