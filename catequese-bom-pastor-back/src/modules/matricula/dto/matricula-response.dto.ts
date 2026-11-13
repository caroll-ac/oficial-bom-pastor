import { ApiProperty } from '@nestjs/swagger';

class ResponsavelMatriculaResponseDto {
  @ApiProperty()
  nome: string;

  @ApiProperty()
  cpf: string;

  @ApiProperty()
  parentesco: string;

  @ApiProperty({ type: String, format: 'date-time' })
  dataNascimento: Date;

  @ApiProperty()
  telefone: string;

  @ApiProperty()
  whatsapp: string;

  @ApiProperty()
  email: string;
}

class CatequizandoMatriculaResponseDto {
  @ApiProperty()
  nome: string;

  @ApiProperty({ type: String, format: 'date-time' })
  dataNascimento: Date;

  @ApiProperty()
  endereco: string;

  @ApiProperty()
  telefoneEmergencia: string;
}

class EtapaMatriculaResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty()
  nome: string;
}

export class MatriculaResponseDto {
  @ApiProperty({ example: '9007199254740995', description: 'Protocolo da matrícula' })
  protocolo: string;

  @ApiProperty({ type: ResponsavelMatriculaResponseDto })
  responsavel: ResponsavelMatriculaResponseDto;

  @ApiProperty({ type: CatequizandoMatriculaResponseDto })
  catequizando: CatequizandoMatriculaResponseDto;

  @ApiProperty({ type: EtapaMatriculaResponseDto })
  etapa: EtapaMatriculaResponseDto;

  @ApiProperty({ example: 'PENDENTE' })
  status: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  dataSolicitacao: Date | null;
}
