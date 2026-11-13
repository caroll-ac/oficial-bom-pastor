import { ApiProperty } from '@nestjs/swagger';
import { MatriculaResponseDto } from './matricula-response.dto';

export class DocumentoMatriculaResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'certidao.pdf' })
  nomeArquivo: string;

  @ApiProperty({ example: 'CERTIDAO_NASCIMENTO' })
  tipoDocumento: string;

  @ApiProperty({ example: 'PENDENTE' })
  status: string;

  @ApiProperty({ type: String, nullable: true })
  parecer: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  dataEnvio: Date | null;
}

export class MatriculaDetalheResponseDto extends MatriculaResponseDto {
  @ApiProperty({ type: [DocumentoMatriculaResponseDto] })
  documentos: DocumentoMatriculaResponseDto[];
}
