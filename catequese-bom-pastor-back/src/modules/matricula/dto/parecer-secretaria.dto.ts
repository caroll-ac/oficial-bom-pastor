import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export const RESULTADOS_SECRETARIA = ['DOCUMENTACAO_OK', 'PENDENCIA_DOCUMENTAL'] as const;
export type ResultadoSecretaria = (typeof RESULTADOS_SECRETARIA)[number];

const trim = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
  const value = obj[key];
  return typeof value === 'string' ? value.trim() : value;
};

export class ParecerSecretariaDto {
  @ApiProperty({ enum: RESULTADOS_SECRETARIA })
  @IsIn(RESULTADOS_SECRETARIA)
  resultado: ResultadoSecretaria;

  @ApiProperty({ maxLength: 1000 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  parecer: string;
}

export class DecisaoSecretariaResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'SECRETARIA' })
  etapa: string;

  @ApiProperty({ example: 'DOCUMENTACAO_OK' })
  resultado: string;

  @ApiProperty({ type: String, nullable: true })
  parecer: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  decididoEm: Date;
}

export class ParecerSecretariaResponseDto {
  @ApiProperty({ example: '9007199254740995' })
  protocolo: string;

  @ApiProperty({ example: 'AGUARDANDO_COORDENADOR' })
  status: string;

  @ApiProperty({ type: DecisaoSecretariaResponseDto })
  decisao: DecisaoSecretariaResponseDto;
}
