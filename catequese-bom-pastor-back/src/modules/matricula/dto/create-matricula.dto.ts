import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateDocumentoDto } from '../../documento/dto/create-documento.dto';

const trim = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
  const value = obj[key];
  return typeof value === 'string' ? value.trim() : value;
};

export class CreateMatriculaDto {
  @ApiProperty({ maxLength: 150 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  responsavelNome: string;

  @ApiProperty({ maxLength: 14 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(14)
  responsavelCpf: string;

  @ApiProperty({ maxLength: 50 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  responsavelParentesco: string;

  @ApiProperty({ example: '1980-05-10', format: 'date' })
  @Transform(trim)
  @IsString()
  @Matches(/^[1-9]\d{3}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  responsavelDataNascimento: string;

  @ApiProperty({ maxLength: 20 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  responsavelTelefone: string;

  @ApiProperty({ maxLength: 20 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  responsavelWhatsapp: string;

  @ApiProperty({ maxLength: 150, format: 'email' })
  @Transform(trim)
  @IsEmail()
  @MaxLength(150)
  responsavelEmail: string;

  @ApiProperty({ maxLength: 150 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  catequizandoNome: string;

  @ApiProperty({ example: '2015-03-20', format: 'date' })
  @Transform(trim)
  @IsString()
  @Matches(/^[1-9]\d{3}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  catequizandoDataNascimento: string;

  @ApiProperty({ maxLength: 16000 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(16000)
  catequizandoEndereco: string;

  @ApiProperty({ maxLength: 20 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  catequizandoTelefoneEmergencia: string;

  @ApiProperty({ example: '1', description: 'ID da etapa como string decimal' })
  @Transform(({ obj, key }) => obj[key])
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  etapaId: string;

  @ApiPropertyOptional({ maxLength: 16000, nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(16000)
  observacao?: string | null;

  @ApiProperty({ type: [CreateDocumentoDto], minItems: 2, maxItems: 3 })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(3)
  @ArrayUnique((documento: CreateDocumentoDto) => documento?.tipoDocumento)
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentoDto)
  documentos: CreateDocumentoDto[];
}
