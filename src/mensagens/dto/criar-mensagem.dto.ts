import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const aparar = ({ value }) => (typeof value === 'string' ? value.trim() : value);

export class CriarMensagemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Transform(aparar)
  nome: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1500)
  @Transform(aparar)
  texto: string;
}
