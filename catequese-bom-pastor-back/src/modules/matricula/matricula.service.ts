import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateMatriculaDto } from './dto/create-matricula.dto';
import { MatriculaResponseDto } from './dto/matricula-response.dto';

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
