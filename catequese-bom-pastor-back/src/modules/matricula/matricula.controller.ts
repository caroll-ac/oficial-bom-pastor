import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { USER_ROLES } from '../../common/constants/user-roles';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CreateMatriculaDto } from './dto/create-matricula.dto';
import { MatriculaDetalheResponseDto } from './dto/matricula-detalhe-response.dto';
import { MatriculaResponseDto } from './dto/matricula-response.dto';
import { MatriculaService } from './matricula.service';

@ApiTags('matriculas')
@Controller()
export class MatriculaController {
  constructor(private readonly matriculaService: MatriculaService) {}

  @Get('etapas')
  @Public()
  @ApiOperation({ summary: 'Listar etapas catequéticas ativas' })
  @ApiResponse({ status: 200, description: 'Etapas ativas ordenadas' })
  listarEtapas() {
    return this.matriculaService.listarEtapas();
  }

  @Get('matriculas')
  @Roles(USER_ROLES.ADMINISTRADOR, USER_ROLES.SECRETARIA, USER_ROLES.COORDENADOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar matrículas para análise' })
  @ApiResponse({ status: 200, type: [MatriculaResponseDto] })
  listar(): Promise<MatriculaResponseDto[]> {
    return this.matriculaService.listar();
  }

  @Get('matriculas/minhas')
  @Roles(USER_ROLES.RESPONSAVEL)
  @ApiOperation({ summary: 'Listar matrículas aprovadas do responsável autenticado' })
  minhas(@GetUser('id') usuarioId: string) {
    return this.matriculaService.listarMinhas(usuarioId);
  }

  @Get('matriculas/:id')
  @Roles(USER_ROLES.ADMINISTRADOR, USER_ROLES.SECRETARIA, USER_ROLES.COORDENADOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhar matrícula com documentos' })
  @ApiResponse({ status: 200, type: MatriculaDetalheResponseDto })
  @ApiResponse({ status: 400, description: 'ID inválido' })
  @ApiResponse({ status: 404, description: 'Matrícula não encontrada' })
  buscarPorId(@Param('id') id: string): Promise<MatriculaDetalheResponseDto> {
    return this.matriculaService.buscarPorId(id);
  }

  @Post('matriculas')
  @Public()
  @ApiOperation({ summary: 'Enviar matrícula' })
  @ApiResponse({ status: 201, description: 'Matrícula criada com status PENDENTE' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou etapa inexistente ou inativa' })
  criar(@Body() dto: CreateMatriculaDto) {
    return this.matriculaService.criar(dto);
  }
}
