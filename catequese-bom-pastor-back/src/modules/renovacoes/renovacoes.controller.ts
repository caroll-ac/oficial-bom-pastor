import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { USER_ROLES } from '../../common/constants/user-roles';
import { RenovacoesService, RenewalFiles, RenewalUpload } from './renovacoes.service';

class CreateRenovacaoDto {
  @IsString()
  catequizandoId: string;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  ano: number;
}

class DecisaoDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  observacoes?: string;
}

class RenovacaoDocumentoDto {
  @IsIn(['CERTIFICADO_BATISMO', 'COMPROVANTE_ENDERECO', 'CERTIDAO_NASCIMENTO'])
  tipo: 'CERTIFICADO_BATISMO' | 'COMPROVANTE_ENDERECO' | 'CERTIDAO_NASCIMENTO';
}

class ObservacaoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  observacao: string;
}

class PeriodoDto {
  @IsString()
  @Matches(/^[1-9]\d{3}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dataLiberacao: string;
}

@Controller('renovacoes')
export class RenovacoesController {
  constructor(private readonly service: RenovacoesService) {}

  @Get('me')
  @Roles(USER_ROLES.RESPONSAVEL)
  mine(@GetUser('id') userId: string) {
    return this.service.mine(userId);
  }

  @Get('periodo')
  @Roles(USER_ROLES.ADMINISTRADOR, USER_ROLES.SECRETARIA, USER_ROLES.COORDENADOR, USER_ROLES.RESPONSAVEL)
  periodo() {
    return this.service.periodo();
  }

  @Put('periodo')
  @Roles(USER_ROLES.ADMINISTRADOR)
  definirPeriodo(@Body() dto: PeriodoDto) {
    return this.service.definirPeriodo(dto.dataLiberacao);
  }

  @Delete('periodo')
  @Roles(USER_ROLES.ADMINISTRADOR)
  fecharPeriodo() {
    return this.service.fecharPeriodo();
  }

  @Get()
  @Roles(USER_ROLES.ADMINISTRADOR, USER_ROLES.SECRETARIA, USER_ROLES.COORDENADOR)
  list() {
    return this.service.list();
  }

  @Post()
  @Roles(USER_ROLES.RESPONSAVEL)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'comprovantePix', maxCount: 1 },
    { name: 'certificadoBatismo', maxCount: 1 },
    { name: 'comprovanteEndereco', maxCount: 1 },
    { name: 'certidaoNascimento', maxCount: 1 },
  ], { limits: { fileSize: 5 * 1024 * 1024, files: 4 } }))
  create(@GetUser('id') userId: string, @Body() dto: CreateRenovacaoDto, @UploadedFiles() files: RenewalFiles) {
    return this.service.create(userId, dto.catequizandoId, dto.ano, files);
  }

  @Post(':id/documentos')
  @Roles(USER_ROLES.ADMINISTRADOR, USER_ROLES.SECRETARIA, USER_ROLES.COORDENADOR)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'documento', maxCount: 1 }], {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  }))
  adicionarDocumento(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() dto: RenovacaoDocumentoDto,
    @UploadedFiles() files: Partial<Record<'documento', RenewalUpload[]>>,
  ) {
    return this.service.addDocument(id, userId, dto.tipo, files.documento?.[0]);
  }

  @Put(':id/documentos/:tipo')
  @Roles(USER_ROLES.ADMINISTRADOR, USER_ROLES.SECRETARIA, USER_ROLES.COORDENADOR)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'documento', maxCount: 1 }], {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  }))
  substituirDocumento(
    @Param('id') id: string,
    @Param('tipo') tipo: string,
    @GetUser('id') userId: string,
    @UploadedFiles() files: Partial<Record<'documento', RenewalUpload[]>>,
  ) {
    return this.service.replaceDocument(id, userId, tipo, files.documento?.[0]);
  }

  @Post(':id/observacoes')
  @Roles(USER_ROLES.ADMINISTRADOR, USER_ROLES.SECRETARIA, USER_ROLES.COORDENADOR)
  registrarObservacao(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() dto: ObservacaoDto,
  ) {
    return this.service.registerObservation(id, userId, dto.observacao);
  }

  @Patch(':id')
  @Roles(USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDENADOR)
  decide(@Param('id') id: string, @GetUser('id') userId: string, @Body() dto: DecisaoDto) {
    return this.service.decide(id, dto.status, dto.observacoes, userId);
  }
}
