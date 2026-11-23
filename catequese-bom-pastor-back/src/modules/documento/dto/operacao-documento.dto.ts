import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';
import { CreateDocumentoDto } from './create-documento.dto';

const trim = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
  const value = obj[key];
  return typeof value === 'string' ? value.trim() : value;
};

export class AdicionarDocumentoDto extends CreateDocumentoDto {
  @ApiPropertyOptional({ maxLength: 1000 })
  @Transform(trim)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  observacao?: string;
}

export class SubstituirDocumentoDto {
  @ApiProperty({ maxLength: 255 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nomeArquivo: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @Transform(trim)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  observacao?: string;
}

export class AtualizarDocumentoDto {
  @ApiPropertyOptional({ enum: ['PENDENTE', 'APROVADO', 'REJEITADO'] })
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(['PENDENTE', 'APROVADO', 'REJEITADO'])
  status?: string;

  @ApiPropertyOptional({ maxLength: 1000, description: 'Texto vazio remove o parecer.' })
  @Transform(trim)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(1000)
  parecer?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @Transform(trim)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  observacao?: string;
}
