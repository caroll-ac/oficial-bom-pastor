import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { DecisaoMatriculaResponseDto, trim } from './parecer-secretaria.dto';

export const RESULTADOS_COORDENADOR = ['APROVADA', 'REJEITADA'] as const;
export type ResultadoCoordenador = (typeof RESULTADOS_COORDENADOR)[number];

export class DecisaoCoordenadorDto {
  @ApiProperty({ enum: RESULTADOS_COORDENADOR })
  @IsIn(RESULTADOS_COORDENADOR)
  resultado: ResultadoCoordenador;

  @ApiProperty({ maxLength: 1000 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  parecer: string;
}

export class DecisaoCoordenadorResponseDto {
  @ApiProperty({ example: '9007199254740995' })
  protocolo: string;

  @ApiProperty({ example: 'APROVADA' })
  status: string;

  @ApiProperty({ type: DecisaoMatriculaResponseDto })
  decisao: DecisaoMatriculaResponseDto;
}
