import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { USER_ROLES, UserRole } from '../../common/constants/user-roles';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AdicionarDocumentoDto, AtualizarDocumentoDto, SubstituirDocumentoDto } from './dto/operacao-documento.dto';

export interface UsuarioAutenticado {
  id: string;
  perfis: UserRole[];
}

const documentoSelect = {
  id: true,
  matriculaId: true,
  nomeArquivo: true,
  tipoDocumento: true,
  status: true,
  parecer: true,
  dataEnvio: true,
} satisfies Prisma.DocumentoSelect;

type DocumentoSelecionado = Prisma.DocumentoGetPayload<{ select: typeof documentoSelect }>;

@Injectable()
export class DocumentoService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(matriculaId: string, usuarioId: string, dto: AdicionarDocumentoDto) {
    const id = this.parseId(matriculaId);
    const autorId = this.parseId(usuarioId);
    return this.transacao(async (tx) => {
      await this.bloquearMatricula(tx, id);
      const documento = await tx.documento.create({
        data: { matriculaId: id, nomeArquivo: dto.nomeArquivo, tipoDocumento: dto.tipoDocumento, status: 'PENDENTE', parecer: null },
        select: documentoSelect,
      });
      await this.registrarHistorico(tx, id, autorId, 'DOCUMENTO_ADICIONADO',
        `Documento ${documento.id} (${documento.tipoDocumento}) adicionado: ${documento.nomeArquivo}.`, dto.observacao);
      return this.serializar(documento);
    });
  }

  async substituir(matriculaId: string, documentoId: string, usuarioId: string, dto: SubstituirDocumentoDto) {
    const id = this.parseId(matriculaId);
    const docId = this.parseId(documentoId);
    const autorId = this.parseId(usuarioId);
    return this.transacao(async (tx) => {
      await this.bloquearMatricula(tx, id);
      const anterior = await tx.documento.findFirst({ where: { id: docId, matriculaId: id }, select: documentoSelect });
      if (!anterior) throw new NotFoundException('Documento não encontrado.');
      const documento = await tx.documento.update({
        where: { id: docId },
        data: { nomeArquivo: dto.nomeArquivo, status: 'PENDENTE', parecer: null, dataEnvio: new Date() },
        select: documentoSelect,
      });
      await this.registrarHistorico(tx, id, autorId, 'DOCUMENTO_SUBSTITUIDO',
        `Documento ${docId} (${anterior.tipoDocumento}) substituído: ${anterior.nomeArquivo} → ${documento.nomeArquivo}. Status anterior: ${anterior.status}. Parecer anterior: ${anterior.parecer ?? 'não informado'}.`, dto.observacao);
      return this.serializar(documento);
    });
  }

  async atualizar(matriculaId: string, documentoId: string, usuarioId: string, dto: AtualizarDocumentoDto) {
    const id = this.parseId(matriculaId);
    const docId = this.parseId(documentoId);
    const autorId = this.parseId(usuarioId);
    if (dto.status === undefined && dto.parecer === undefined) {
      throw new BadRequestException('Informe status ou parecer para atualizar.');
    }
    return this.transacao(async (tx) => {
      await this.bloquearMatricula(tx, id);
      const anterior = await tx.documento.findFirst({ where: { id: docId, matriculaId: id }, select: documentoSelect });
      if (!anterior) throw new NotFoundException('Documento não encontrado.');
      const documento = await tx.documento.update({
        where: { id: docId },
        data: {
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.parecer !== undefined && { parecer: dto.parecer || null }),
        },
        select: documentoSelect,
      });
      const mudancas: string[] = [];
      if (dto.status !== undefined) mudancas.push(`Status: ${anterior.status} → ${documento.status}.`);
      if (dto.parecer !== undefined) mudancas.push(`Parecer: ${anterior.parecer ?? 'não informado'} → ${documento.parecer ?? 'não informado'}.`);
      await this.registrarHistorico(tx, id, autorId, 'DOCUMENTO_ATUALIZADO',
        `Documento ${docId} (${anterior.tipoDocumento}): ${mudancas.join(' ')}`, dto.observacao);
      return this.serializar(documento);
    });
  }

  private async transacao<T>(operacao: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(operacao, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('A matrícula foi alterada simultaneamente. Atualize os dados e tente novamente.');
      }
      throw error;
    }
  }

  private async bloquearMatricula(tx: Prisma.TransactionClient, id: bigint) {
    const [matricula] = await tx.$queryRaw<{ status: string }[]>`
      SELECT status FROM matricula WHERE id = ${id} FOR UPDATE
    `;
    if (!matricula) throw new NotFoundException('Matrícula não encontrada.');
    if (!['PENDENTE', 'AGUARDANDO_COORDENADOR'].includes(matricula.status)) {
      throw new ConflictException('Esta matrícula não permite alterações de documentos.');
    }
  }

  private async registrarHistorico(tx: Prisma.TransactionClient, matriculaId: bigint, usuarioId: bigint, resultado: string, descricao: string, observacao?: string) {
    await tx.matriculaDecisao.create({
      data: { matriculaId, usuarioId, etapa: 'SECRETARIA', resultado, parecer: observacao ? `${descricao}\n${observacao}` : descricao },
    });
  }

  async listar(matriculaId: string, usuario: UsuarioAutenticado) {
    const id = this.parseId(matriculaId);
    await this.validarAcesso(id, usuario);
    const documentos = await this.prisma.documento.findMany({
      where: { matriculaId: id },
      select: documentoSelect,
      orderBy: { id: 'asc' },
    });
    return documentos.map((documento) => this.serializar(documento));
  }

  async buscar(matriculaId: string, documentoId: string, usuario: UsuarioAutenticado) {
    const id = this.parseId(matriculaId);
    const idDocumento = this.parseId(documentoId);
    await this.validarAcesso(id, usuario);
    const documento = await this.prisma.documento.findFirst({
      where: { id: idDocumento, matriculaId: id },
      select: documentoSelect,
    });
    if (!documento) throw new NotFoundException('Documento não encontrado.');
    return this.serializar(documento);
  }

  private async validarAcesso(id: bigint, usuario: UsuarioAutenticado) {
    const equipe = [USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDENADOR, USER_ROLES.SECRETARIA]
      .some((perfil) => usuario.perfis.includes(perfil));
    const where: Prisma.MatriculaWhereInput = equipe
      ? { id }
      : { id, status: 'APROVADA', responsavel: { usuarioId: this.parseId(usuario.id) } };
    const matricula = await this.prisma.matricula.findFirst({ where, select: { id: true } });
    if (!matricula) throw new NotFoundException('Matrícula não encontrada.');
  }

  private parseId(value: string) {
    if (!/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) {
      throw new BadRequestException('Identificador inválido.');
    }
    return BigInt(value);
  }

  private serializar(documento: DocumentoSelecionado) {
    return { ...documento, id: documento.id.toString(), matriculaId: documento.matriculaId.toString() };
  }
}
