import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateMatriculaDto } from './dto/create-matricula.dto';
import { DecisaoCoordenadorDto, DecisaoCoordenadorResponseDto } from './dto/decisao-coordenador.dto';
import { MatriculaDetalheResponseDto } from './dto/matricula-detalhe-response.dto';
import { MatriculaResponseDto } from './dto/matricula-response.dto';
import {
  ParecerSecretariaDto,
  ParecerSecretariaResponseDto,
  ResultadoSecretaria,
} from './dto/parecer-secretaria.dto';

const STATUS_POR_RESULTADO: Record<ResultadoSecretaria, string> = {
  DOCUMENTACAO_OK: 'AGUARDANDO_COORDENADOR',
  PENDENCIA_DOCUMENTAL: 'PENDENCIA_DOCUMENTAL',
};

@Injectable()
export class MatriculaService {
  constructor(private readonly prisma: PrismaService) {}

  async listarEtapas() {
    const etapas = await this.prisma.etapaCatequetica.findMany({
      where: { ativa: true },
      select: { id: true, nome: true, descricao: true, ordem: true },
      orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
    });
    return etapas.map((etapa) => ({ ...etapa, id: etapa.id.toString() }));
  }

  async listar(): Promise<MatriculaResponseDto[]> {
    const matriculas = await this.prisma.matricula.findMany({
      select: {
        id: true,
        status: true,
        dataSolicitacao: true,
        responsavelNome: true,
        responsavelCpf: true,
        responsavelParentesco: true,
        responsavelDataNascimento: true,
        responsavelTelefone: true,
        responsavelWhatsapp: true,
        responsavelEmail: true,
        catequizandoNome: true,
        catequizandoDataNascimento: true,
        catequizandoEndereco: true,
        catequizandoTelefoneEmergencia: true,
        etapa: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: [
        { dataSolicitacao: 'desc' },
        { id: 'desc' },
      ],
    });

    return matriculas.map((matricula) => ({
      protocolo: matricula.id.toString(),
      responsavel: {
        nome: matricula.responsavelNome,
        cpf: matricula.responsavelCpf,
        parentesco: matricula.responsavelParentesco,
        dataNascimento: matricula.responsavelDataNascimento,
        telefone: matricula.responsavelTelefone,
        whatsapp: matricula.responsavelWhatsapp,
        email: matricula.responsavelEmail,
      },
      catequizando: {
        nome: matricula.catequizandoNome,
        dataNascimento: matricula.catequizandoDataNascimento,
        endereco: matricula.catequizandoEndereco,
        telefoneEmergencia: matricula.catequizandoTelefoneEmergencia,
      },
      etapa: {
        id: matricula.etapa.id.toString(),
        nome: matricula.etapa.nome,
      },
      status: matricula.status,
      dataSolicitacao: matricula.dataSolicitacao,
    }));
  }

  async buscarPorId(idParam: string): Promise<MatriculaDetalheResponseDto> {
    if (!/^[1-9]\d{0,18}$/.test(idParam) || BigInt(idParam) > 9223372036854775807n) {
      throw new BadRequestException('ID de matrícula inválido.');
    }

    const matricula = await this.prisma.matricula.findUnique({
      where: { id: BigInt(idParam) },
      select: {
        id: true,
        status: true,
        dataSolicitacao: true,
        responsavelNome: true,
        responsavelCpf: true,
        responsavelParentesco: true,
        responsavelDataNascimento: true,
        responsavelTelefone: true,
        responsavelWhatsapp: true,
        responsavelEmail: true,
        catequizandoNome: true,
        catequizandoDataNascimento: true,
        catequizandoEndereco: true,
        catequizandoTelefoneEmergencia: true,
        etapa: { select: { id: true, nome: true } },
        documentos: {
          select: {
            id: true,
            nomeArquivo: true,
            tipoDocumento: true,
            status: true,
            parecer: true,
            dataEnvio: true,
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!matricula) {
      throw new NotFoundException('Matrícula não encontrada.');
    }

    return {
      protocolo: matricula.id.toString(),
      responsavel: {
        nome: matricula.responsavelNome,
        cpf: matricula.responsavelCpf,
        parentesco: matricula.responsavelParentesco,
        dataNascimento: matricula.responsavelDataNascimento,
        telefone: matricula.responsavelTelefone,
        whatsapp: matricula.responsavelWhatsapp,
        email: matricula.responsavelEmail,
      },
      catequizando: {
        nome: matricula.catequizandoNome,
        dataNascimento: matricula.catequizandoDataNascimento,
        endereco: matricula.catequizandoEndereco,
        telefoneEmergencia: matricula.catequizandoTelefoneEmergencia,
      },
      etapa: { id: matricula.etapa.id.toString(), nome: matricula.etapa.nome },
      status: matricula.status,
      dataSolicitacao: matricula.dataSolicitacao,
      documentos: matricula.documentos.map((documento) => ({
        id: documento.id.toString(),
        nomeArquivo: documento.nomeArquivo,
        tipoDocumento: documento.tipoDocumento,
        status: documento.status,
        parecer: documento.parecer,
        dataEnvio: documento.dataEnvio,
      })),
    };
  }

  async listarMinhas(usuarioId: string) {
    if (!/^[1-9]\d{0,18}$/.test(usuarioId) || BigInt(usuarioId) > 9223372036854775807n) {
      throw new BadRequestException('Identificador inválido.');
    }
    const matriculas = await this.prisma.matricula.findMany({
      where: { status: 'APROVADA', responsavel: { usuarioId: BigInt(usuarioId) } },
      select: {
        id: true, status: true, dataSolicitacao: true, catequizandoNome: true,
        etapa: { select: { id: true, nome: true } },
      },
      orderBy: { id: 'desc' },
    });
    return matriculas.map((matricula) => ({
      ...matricula,
      id: matricula.id.toString(),
      etapa: { ...matricula.etapa, id: matricula.etapa.id.toString() },
    }));
  }

  async registrarParecerSecretaria(
    idParam: string,
    usuarioIdParam: string,
    dto: ParecerSecretariaDto,
  ): Promise<ParecerSecretariaResponseDto> {
    const matriculaId = this.parseId(idParam, 'ID de matrícula inválido.');
    const usuarioId = this.parseId(usuarioIdParam, 'Identificador inválido.');
    const novoStatus = STATUS_POR_RESULTADO[dto.resultado];

    return this.prisma.$transaction(async (tx) => {
      // O filtro por PENDENTE garante que só uma análise concorrente vença.
      const atualizadas = await tx.matricula.updateMany({
        where: { id: matriculaId, status: 'PENDENTE' },
        data: { status: novoStatus },
      });

      if (atualizadas.count === 0) {
        const existente = await tx.matricula.findUnique({
          where: { id: matriculaId },
          select: { status: true },
        });
        if (!existente) {
          throw new NotFoundException('Matrícula não encontrada.');
        }
        throw new ConflictException('Apenas matrículas PENDENTE podem ser analisadas.');
      }

      const decisao = await tx.matriculaDecisao.create({
        data: {
          matriculaId,
          usuarioId,
          etapa: 'SECRETARIA',
          resultado: dto.resultado,
          parecer: dto.parecer,
        },
        select: { id: true, etapa: true, resultado: true, parecer: true, decididoEm: true },
      });

      return {
        protocolo: matriculaId.toString(),
        status: novoStatus,
        decisao: { ...decisao, id: decisao.id.toString() },
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async registrarDecisaoCoordenador(
    idParam: string,
    usuarioIdParam: string,
    dto: DecisaoCoordenadorDto,
  ): Promise<DecisaoCoordenadorResponseDto> {
    const matriculaId = this.parseId(idParam, 'ID de matrícula inválido.');
    const usuarioId = this.parseId(usuarioIdParam, 'Identificador inválido.');

    return this.prisma.$transaction(async (tx) => {
      // O filtro por AGUARDANDO_COORDENADOR garante que só uma decisão concorrente vença.
      const atualizadas = await tx.matricula.updateMany({
        where: { id: matriculaId, status: 'AGUARDANDO_COORDENADOR' },
        data: {
          status: dto.resultado,
          dataAprovacao: dto.resultado === 'APROVADA' ? new Date() : null,
        },
      });

      if (atualizadas.count === 0) {
        const existente = await tx.matricula.findUnique({
          where: { id: matriculaId },
          select: { status: true },
        });
        if (!existente) {
          throw new NotFoundException('Matrícula não encontrada.');
        }
        throw new ConflictException('Apenas matrículas AGUARDANDO_COORDENADOR podem ser decididas.');
      }

      const decisao = await tx.matriculaDecisao.create({
        data: {
          matriculaId,
          usuarioId,
          etapa: 'COORDENADOR',
          resultado: dto.resultado,
          parecer: dto.parecer,
        },
        select: { id: true, etapa: true, resultado: true, parecer: true, decididoEm: true },
      });

      return {
        protocolo: matriculaId.toString(),
        status: dto.resultado,
        decisao: { ...decisao, id: decisao.id.toString() },
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private parseId(valor: string, mensagem: string): bigint {
    if (!/^[1-9]\d{0,18}$/.test(valor) || BigInt(valor) > 9223372036854775807n) {
      throw new BadRequestException(mensagem);
    }
    return BigInt(valor);
  }

  async criar(dto: CreateMatriculaDto) {
    const etapaId = BigInt(dto.etapaId);
    if (etapaId > 9223372036854775807n) {
      throw new BadRequestException('Etapa inválida.');
    }

    return this.prisma.$transaction(async (tx) => {
      const etapa = await tx.etapaCatequetica.findFirst({
        where: { id: etapaId, ativa: true },
        select: { id: true },
      });
      if (!etapa) {
        throw new BadRequestException('Etapa inexistente ou inativa.');
      }

      const matricula = await tx.matricula.create({
        data: {
          status: 'PENDENTE',
          etapaId,
          responsavelNome: dto.responsavelNome,
          responsavelCpf: dto.responsavelCpf,
          responsavelParentesco: dto.responsavelParentesco,
          responsavelDataNascimento: new Date(`${dto.responsavelDataNascimento}T00:00:00.000Z`),
          responsavelTelefone: dto.responsavelTelefone,
          responsavelWhatsapp: dto.responsavelWhatsapp,
          responsavelEmail: dto.responsavelEmail,
          catequizandoNome: dto.catequizandoNome,
          catequizandoDataNascimento: new Date(`${dto.catequizandoDataNascimento}T00:00:00.000Z`),
          catequizandoEndereco: dto.catequizandoEndereco,
          catequizandoTelefoneEmergencia: dto.catequizandoTelefoneEmergencia,
          observacao: dto.observacao ?? null,
          documentos: {
            create: dto.documentos.map((documento) => ({
              nomeArquivo: documento.nomeArquivo,
              tipoDocumento: documento.tipoDocumento,
              status: 'PENDENTE',
              parecer: null,
            })),
          },
        },
        select: { id: true, status: true, dataSolicitacao: true },
      });

      return { ...matricula, id: matricula.id.toString() };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
