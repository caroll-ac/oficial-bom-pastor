import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailerService } from '../../common/mailer/mailer.service';
import { AuthService } from '../auth/auth.service';
import { CreateMatriculaDto } from './dto/create-matricula.dto';
import { DecisaoCoordenadorDto, DecisaoCoordenadorResponseDto } from './dto/decisao-coordenador.dto';
import { MatriculaDetalheResponseDto } from './dto/matricula-detalhe-response.dto';
import { MatriculaResponseDto } from './dto/matricula-response.dto';
import {
  ParecerSecretariaDto,
  ParecerSecretariaResponseDto,
} from './dto/parecer-secretaria.dto';

@Injectable()
export class MatriculaService {
  private readonly logger = new Logger(MatriculaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {}

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
        decisoes: {
          where: { etapa: 'SECRETARIA' },
          select: { id: true, resultado: true, parecer: true, decididoEm: true, usuarioId: true },
          orderBy: [{ decididoEm: 'asc' }, { id: 'asc' }],
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
      analisesSecretaria: matricula.decisoes.map((decisao) => ({
        ...decisao,
        id: decisao.id.toString(),
        usuarioId: decisao.usuarioId.toString(),
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
    return this.prisma.$transaction(async (tx) => {
      // Bloqueia a matrícula até o registro da análise para evitar corrida com a decisão final.
      const [matricula] = await tx.$queryRaw<{ status: string }[]>`
        SELECT status FROM matricula WHERE id = ${matriculaId} FOR UPDATE
      `;
      if (!matricula) {
        throw new NotFoundException('Matrícula não encontrada.');
      }
      if (!['PENDENTE', 'AGUARDANDO_COORDENADOR'].includes(matricula.status)) {
        throw new ConflictException('Apenas matrículas PENDENTE ou AGUARDANDO_COORDENADOR podem ser analisadas.');
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
        status: matricula.status,
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

    const resultado = await this.prisma.$transaction(async (tx) => {
      // O filtro de status garante que só uma decisão concorrente vença.
      const atualizadas = await tx.matricula.updateMany({
        where: { id: matriculaId, status: { in: ['PENDENTE', 'AGUARDANDO_COORDENADOR'] } },
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
        throw new ConflictException('Apenas matrículas PENDENTE ou AGUARDANDO_COORDENADOR podem ser decididas.');
      }

      if (dto.resultado === 'APROVADA') {
        const matricula = await tx.matricula.findUniqueOrThrow({ where: { id: matriculaId } });
        const usuarios = await tx.usuario.findMany({
          where: { email: { equals: matricula.responsavelEmail.trim(), mode: 'insensitive' } },
          include: { responsavel: true, perfis: { include: { perfil: true } } },
        });
        if (usuarios.length > 1) throw new ConflictException('Há contas duplicadas para o e-mail. Contate o administrador.');
        let responsavelId: bigint;
        const existente = usuarios[0];
        if (existente) {
          const cpfInformado = matricula.responsavelCpf.replace(/\D/g, '');
          const cpfCadastrado = existente.responsavel?.cpf.replace(/\D/g, '');
          if (!existente.ativo || !existente.responsavel || !cpfInformado || cpfInformado !== cpfCadastrado ||
              !existente.perfis.some((item) => item.perfil.nome === 'RESPONSAVEL')) {
            throw new ConflictException('Não foi possível vincular o responsável. Confira o cadastro com a administração.');
          }
          responsavelId = existente.responsavel.id;
        } else {
          const perfil = await tx.perfil.findUnique({ where: { nome: 'RESPONSAVEL' } });
          if (!perfil) throw new ConflictException('Perfil de responsável não configurado. Contate o administrador.');
          const senha = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
          const usuario = await tx.usuario.create({
            data: {
              nome: matricula.responsavelNome,
              email: matricula.responsavelEmail.trim(),
              telefone: matricula.responsavelTelefone,
              senha,
              ativo: true,
              primeiroAcesso: true,
              perfis: { create: { perfilId: perfil.id } },
              responsavel: { create: { cpf: matricula.responsavelCpf, parentesco: matricula.responsavelParentesco } },
            },
            include: { responsavel: true },
          });
          responsavelId = usuario.responsavel.id;
        }
        const child = await tx.catequizando.findFirst({
          where: { responsavelId, nome: matricula.catequizandoNome, dataNascimento: matricula.catequizandoDataNascimento },
          select: { id: true },
        });
        if (child) throw new ConflictException('Este catequizando já está cadastrado. Para continuar, utilize a rematrícula.');
        await tx.matricula.update({ where: { id: matriculaId }, data: { responsavelId } });
        await tx.catequizando.create({
          data: {
            responsavelId,
            matriculaId,
            nome: matricula.catequizandoNome,
            dataNascimento: matricula.catequizandoDataNascimento,
            endereco: matricula.catequizandoEndereco,
            telefoneEmergencia: matricula.catequizandoTelefoneEmergencia,
          },
        });
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
    if (dto.resultado !== 'APROVADA') return resultado;
    try {
      const notificacao = await this.enviarNotificacaoAprovacao(idParam);
      return { ...resultado, emailEnviado: notificacao.emailEnviado };
    } catch (error) {
      this.logger.error(`Matrícula ${idParam} aprovada, mas não foi possível preparar o e-mail.`, error);
      return { ...resultado, emailEnviado: false };
    }
  }

  async enviarNotificacaoAprovacao(idParam: string) {
    const id = this.parseId(idParam, 'ID de matrícula inválido.');
    const matricula = await this.prisma.matricula.findUnique({
      where: { id },
      include: { responsavel: { include: { usuario: true } } },
    });
    if (!matricula) throw new NotFoundException('Matrícula não encontrada.');
    if (matricula.status !== 'APROVADA' || !matricula.responsavel?.usuario) {
      throw new ConflictException('A matrícula precisa estar aprovada e vinculada a um responsável.');
    }
    const usuario = matricula.responsavel.usuario;
    if (!usuario.ativo) throw new ConflictException('A conta do responsável está inativa.');
    try {
      if (usuario.primeiroAcesso) {
        await this.auth.sendPasswordSetupInvite(usuario.id, true);
      } else {
        const frontendUrl = this.config.get<string>('FRONTEND_URL') ??
          this.config.get<string>('FRONTEND_URLS')?.split(',')[0]?.trim() ?? 'http://localhost:8080';
        const loginUrl = new URL('/login', frontendUrl).toString();
        await this.mailer.sendMail({
          to: [usuario.email],
          subject: 'Matrícula aprovada | Catequese Bom Pastor',
          text: `Olá, ${usuario.nome}.\n\nA coordenação aprovou a matrícula de ${matricula.catequizandoNome}.\n\nAcesse sua conta existente para acompanhar: ${loginUrl}`,
        }, { requireDelivery: true });
      }
      return { emailEnviado: true };
    } catch (error) {
      this.logger.error(`Matrícula ${idParam} aprovada, mas o e-mail não foi enviado.`, error);
      return { emailEnviado: false };
    }
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
