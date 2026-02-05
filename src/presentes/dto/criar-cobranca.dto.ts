import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEmail,
  IsOptional,
  Min,
} from 'class-validator';

export class CriarCobrancaDto {
  @IsString()
  @IsNotEmpty()
  presenteId: string;

  @IsString()
  @IsNotEmpty()
  presenteNome: string;

  @IsNumber()
  @Min(10)
  presenteValor: number;

  @IsString()
  @IsNotEmpty()
  nomeConvidado: string;

  @IsEmail()
  emailConvidado: string;

  @IsOptional()
  @IsString()
  telefoneConvidado?: string;
}
