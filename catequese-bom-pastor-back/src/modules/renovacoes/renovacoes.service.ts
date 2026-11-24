import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { S3StorageService } from '../../common/storage/s3-storage.service';

export type RenewalUpload = { buffer: Buffer; mimetype: string };
export type RenewalFiles = Partial<Record<'comprovantePix' | 'certificadoBatismo' | 'comprovanteEndereco' | 'certidaoNascimento', RenewalUpload[]>>;
type RenewalDocumentType = (typeof DOCUMENTS)[number]['tipo'];
type RenewalOperation = 'DOCUMENTO_ADICIONADO' | 'DOCUMENTO_SUBSTITUIDO' | 'OBSERVACAO' | 'REENVIO' | 'DECISAO';

type LockedRenewal = {
  status: string;
  observacoes: string | null;
  comprovanteKey: string;
};

const DOCUMENTS = [
  { field: 'certificadoBatismo', tipo: 'CERTIFICADO_BATISMO' },
  { field: 'comprovanteEndereco', tipo: 'COMPROVANTE_ENDERECO' },
  { field: 'certidaoNascimento', tipo: 'CERTIDAO_NASCIMENTO' },
] as const;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

@Injectable()
export class RenovacoesService {
  private readonly logger = new Logger(RenovacoesService.name);

  constructor(private readonly prisma: PrismaService, private readonly storage: S3StorageService) {}

  private formatPeriodo(dataLiberacao: Date | null) {
    const data = dataLiberacao ? dataLiberacao.toISOString().slice(0, 10) : null;
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const part = (type: string) => parts.find((item) => item.type === type)?.value;
    const hoje = `${part('year')}-${part('month')}-${part('day')}`;
    return { dataLiberacao: data, aberta: data !== null && data <= hoje };
  }

  async periodo() {
    const configuracao = await this.prisma.renovacaoConfiguracao.findUnique({ where: { id: 1 } });
    return this.formatPeriodo(configuracao?.dataLiberacao ?? null);
  }

  async definirPeriodo(data: string) {
    const dataLiberacao = new Date(`${data}T00:00:00.000Z`);
    if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(data) || Number.isNaN(dataLiberacao.getTime()) ||
        dataLiberacao.toISOString().slice(0, 10) !== data) {
      throw new BadRequestException('Informe uma data de liberação válida.');
    }
    const configuracao = await this.prisma.renovacaoConfiguracao.upsert({
      where: { id: 1 }, create: { id: 1, dataLiberacao }, update: { dataLiberacao },
    });
    return this.formatPeriodo(configuracao.dataLiberacao);
  }

  async fecharPeriodo() {
    await this.prisma.renovacaoConfiguracao.upsert({
      where: { id: 1 }, create: { id: 1, dataLiberacao: null }, update: { dataLiberacao: null },
    });
    return this.formatPeriodo(null);
  }

  private parseId(value: string) {
    if (!/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) {
      throw new BadRequestException('Identificador inválido.');
    }
    return BigInt(value);
  }

  private validateUpload(file: RenewalUpload | undefined): RenewalUpload {
    if (!file || !file.buffer.length || file.buffer.length > 5 * 1024 * 1024 ||
        !ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Envie um arquivo PDF, JPG, PNG ou WEBP de até 5 MB.');
    }
    return file;
  }

  private async lockPendingRenewal(tx: Prisma.TransactionClient, id: bigint): Promise<LockedRenewal> {
    const [renewal] = await tx.$queryRaw<LockedRenewal[]>`
      SELECT status, observacoes, comprovante_key AS "comprovanteKey"
      FROM renovacao
      WHERE id = ${id}
      FOR UPDATE
    `;
    if (!renewal) throw new NotFoundException('Rematrícula não encontrada.');
    if (renewal.status !== 'PENDING') {
      throw new ConflictException('Somente rematrículas PENDING permitem operações.');
    }
    return renewal;
  }

  private historyEntry(operation: RenewalOperation, userId: string, detail: string) {
    return `[${new Date().toISOString()}] ${operation} (usuário ${userId}): ${detail}`;
  }

  private appendObservation(current: string | null, entry: string) {
    return current?.trim() ? `${current}\n${entry}` : entry;
  }

  private async recordOperation(
    tx: Prisma.TransactionClient,
    id: bigint,
    current: string | null,
    userId: string,
    operation: RenewalOperation,
    detail: string,
  ) {
    await tx.renovacao.update({
      where: { id },
      data: { observacoes: this.appendObservation(current, this.historyEntry(operation, userId, detail)) },
    });
  }

  private async children(userId: string) {
    const children = await this.prisma.catequizando.findMany({
      where: { responsavel: { usuarioId: this.parseId(userId) } },
      include: {
        turma: { select: { nome: true } },
        renovacoes: { where: { status: 'APPROVED' }, include: { documentos: true } },
      },
      orderBy: { nome: 'asc' },
    });
    return children.map((child) => ({
      id: child.id.toString(),
      nome: child.nome,
      turma: child.turma?.nome ?? null,
      documentosFaltantes: DOCUMENTS.filter(({ tipo }) =>
        !child.renovacoes.some((renovacao) => renovacao.documentos.some((doc) => doc.tipo === tipo)),
      ).map(({ field }) => field),
    }));
  }

  async mine(userId: string) {
    const usuarioId = this.parseId(userId);
    const [catequizandos, renovacoes] = await Promise.all([
      this.children(userId),
      this.prisma.renovacao.findMany({
        where: { responsavel: { usuarioId } },
        select: { id: true, catequizandoId: true, ano: true, status: true, observacoes: true, criadoEm: true },
        orderBy: { criadoEm: 'desc' },
      }),
    ]);
    return {
      catequizandos,
      renovacoes: renovacoes.map((item) => ({
        ...item, id: item.id.toString(), catequizandoId: item.catequizandoId.toString(),
      })),
    };
  }

  async list() {
    const records = await this.prisma.renovacao.findMany({
      include: {
        catequizando: { select: { nome: true } },
        responsavel: { include: { usuario: { select: { nome: true, email: true, telefone: true } } } },
        documentos: true,
      },
      orderBy: { criadoEm: 'desc' },
    });
    return Promise.all(records.map(async (record) => {
      const previous = await this.prisma.renovacaoDocumento.findMany({
        where: { renovacao: { catequizandoId: record.catequizandoId, status: 'APPROVED' } },
        orderBy: { id: 'desc' },
      });
      return {
        id: record.id.toString(),
        catequizandoId: record.catequizandoId.toString(),
        ano: record.ano,
        status: record.status,
        observacoes: record.observacoes,
        catequizando: record.catequizando,
        responsavel: record.responsavel.usuario,
        comprovanteUrl: await this.storage.getPrivateFileUrl(record.comprovanteKey),
        documentos: await Promise.all(DOCUMENTS.map(async ({ tipo }) => {
          const doc = record.documentos.find((item) => item.tipo === tipo) ?? previous.find((item) => item.tipo === tipo);
          return { tipo, url: doc ? await this.storage.getPrivateFileUrl(doc.fileKey) : null };
        })),
      };
    }));
  }

  async addDocument(idParam: string, userId: string, tipo: RenewalDocumentType, input?: RenewalUpload) {
    const id = this.parseId(idParam);
    if (!DOCUMENTS.some((document) => document.tipo === tipo)) {
      throw new BadRequestException('Tipo de documento inválido.');
    }
    const file = this.validateUpload(input);
    const uploaded = await this.storage.uploadBufferDocument(file.buffer, file.mimetype, 'renovacoes', tipo.toLowerCase());
    try {
      await this.prisma.$transaction(async (tx) => {
        const renewal = await this.lockPendingRenewal(tx, id);
        const existing = await tx.renovacaoDocumento.findUnique({
          where: { renovacaoId_tipo: { renovacaoId: id, tipo } },
          select: { id: true },
        });
        if (existing) throw new ConflictException('Este tipo de documento já existe nesta rematrícula. Substitua-o.');
        await tx.renovacaoDocumento.create({ data: { renovacaoId: id, tipo, fileKey: uploaded.key } });
        await this.recordOperation(tx, id, renewal.observacoes, userId, 'DOCUMENTO_ADICIONADO', tipo);
      });
    } catch (error) {
      await this.cleanup([uploaded.key]);
      throw error;
    }
    return { status: 'PENDING', tipo };
  }

  async replaceDocument(idParam: string, userId: string, tipoParam: string, input?: RenewalUpload) {
    const id = this.parseId(idParam);
    const file = this.validateUpload(input);
    const isPix = tipoParam === 'COMPROVANTE_PIX';
    const tipo = tipoParam as RenewalDocumentType;
    if (!isPix && !DOCUMENTS.some((document) => document.tipo === tipoParam)) {
      throw new BadRequestException('Tipo de documento inválido.');
    }

    const uploaded = await this.storage.uploadBufferDocument(file.buffer, file.mimetype, 'renovacoes', tipoParam.toLowerCase());
    let replacedKey: string | null = null;
    try {
      await this.prisma.$transaction(async (tx) => {
        const renewal = await this.lockPendingRenewal(tx, id);
        if (isPix) {
          replacedKey = renewal.comprovanteKey;
          await tx.renovacao.update({
            where: { id },
            data: { comprovanteKey: uploaded.key },
          });
        } else {
          const existing = await tx.renovacaoDocumento.findUnique({
            where: { renovacaoId_tipo: { renovacaoId: id, tipo } },
            select: { fileKey: true },
          });
          replacedKey = existing?.fileKey ?? null;
          await tx.renovacaoDocumento.upsert({
            where: { renovacaoId_tipo: { renovacaoId: id, tipo } },
            create: { renovacaoId: id, tipo, fileKey: uploaded.key },
            update: { fileKey: uploaded.key },
          });
        }
        await this.recordOperation(tx, id, renewal.observacoes, userId, 'DOCUMENTO_SUBSTITUIDO', tipoParam);
      });
    } catch (error) {
      await this.cleanup([uploaded.key]);
      throw error;
    }
    if (replacedKey) await this.cleanup([replacedKey]);
    return { status: 'PENDING', tipo: tipoParam };
  }

  async registerObservation(idParam: string, userId: string, observation: string) {
    const id = this.parseId(idParam);
    const text = observation.trim();
    if (!text || text.length > 1000) throw new BadRequestException('A observação deve ter entre 1 e 1000 caracteres.');
    return this.prisma.$transaction(async (tx) => {
      const renewal = await this.lockPendingRenewal(tx, id);
      await this.recordOperation(tx, id, renewal.observacoes, userId, 'OBSERVACAO', text);
      return { status: 'PENDING' };
    });
  }

  async create(userId: string, childId: string, ano: number, files: RenewalFiles = {}) {
    if (!(await this.periodo()).aberta) {
      throw new ForbiddenException('A rematrícula ainda não está liberada.');
    }
    const currentYear = new Date().getFullYear();
    if (ano < currentYear || ano > currentYear + 1) {
      throw new BadRequestException('Selecione o ano atual ou o próximo ano.');
    }
    const child = (await this.children(userId)).find((item) => item.id === childId);
    if (!child) throw new NotFoundException('Catequizando não encontrado.');
    const id = this.parseId(childId);
    const responsible = await this.prisma.responsavel.findUnique({ where: { usuarioId: this.parseId(userId) } });
    if (!responsible) throw new NotFoundException('Responsável não encontrado.');
    const prior = await this.prisma.renovacao.findUnique({
      where: { catequizandoId_ano: { catequizandoId: id, ano } },
      include: { documentos: true },
    });
    if (prior && prior.status !== 'REJECTED') throw new ConflictException('Já existe uma solicitação para este ano.');

    for (const field of ['comprovantePix', ...child.documentosFaltantes] as const) {
      if (!files[field]?.[0]) throw new BadRequestException('Anexe o comprovante de Pix e todos os documentos pendentes.');
    }
    for (const field of ['comprovantePix', ...DOCUMENTS.map((doc) => doc.field)] as const) {
      const file = files[field]?.[0];
      if (file && (!ALLOWED_TYPES.includes(file.mimetype) || !file.buffer.length || file.buffer.length > 5 * 1024 * 1024)) {
        throw new BadRequestException('Envie arquivos PDF, JPG, PNG ou WEBP de até 5 MB.');
      }
    }

    const uploaded: string[] = [];
    let result: { id: bigint; status: string };
    try {
      const upload = async (field: keyof RenewalFiles) => {
        const file = files[field][0];
        const uploadedFile = await this.storage.uploadBufferDocument(file.buffer, file.mimetype, 'renovacoes', field);
        uploaded.push(uploadedFile.key);
        return uploadedFile.key;
      };
      const comprovanteKey = await upload('comprovantePix');
      const docs: Array<{ tipo: string; fileKey: string }> = [];
      for (const doc of DOCUMENTS) {
        if (files[doc.field]?.[0]) docs.push({ tipo: doc.tipo, fileKey: await upload(doc.field) });
      }
      result = await this.prisma.$transaction(async (tx) => {
        const [configuracao] = await tx.$queryRaw<{ dataLiberacao: Date | null }[]>`
          SELECT data_liberacao AS "dataLiberacao" FROM renovacao_configuracao WHERE id = 1 FOR UPDATE
        `;
        if (!this.formatPeriodo(configuracao?.dataLiberacao ?? null).aberta) {
          throw new ForbiddenException('A rematrícula não está mais liberada.');
        }
        if (prior) {
          const updated = await tx.renovacao.updateMany({
            where: { id: prior.id, status: 'REJECTED' },
            data: {
              status: 'PENDING',
              comprovanteKey,
              observacoes: this.appendObservation(
                prior.observacoes,
                this.historyEntry('REENVIO', userId, 'Solicitação reenviada pelo responsável.'),
              ),
              criadoEm: new Date(),
            },
          });
          if (!updated.count) throw new ConflictException('A solicitação já foi atualizada.');
          await tx.renovacaoDocumento.deleteMany({ where: { renovacaoId: prior.id } });
          await tx.renovacaoDocumento.createMany({ data: docs.map((doc) => ({ ...doc, renovacaoId: prior.id })) });
          return { id: prior.id, status: 'PENDING' };
        }
        return tx.renovacao.create({
          data: { catequizandoId: id, responsavelId: responsible.id, ano, comprovanteKey, documentos: { create: docs } },
          select: { id: true, status: true },
        });
      });
    } catch (error) {
      await this.cleanup(uploaded);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe uma solicitação para este ano.');
      }
      throw error;
    }
    if (prior) await this.cleanup([prior.comprovanteKey, ...prior.documentos.map((doc) => doc.fileKey)]);
    return { id: result.id.toString(), status: result.status };
  }

  async decide(id: string, status: 'APPROVED' | 'REJECTED', observacoes: string | undefined, userId: string) {
    if (status === 'REJECTED' && !observacoes?.trim()) throw new BadRequestException('Informe o motivo da recusa.');
    const renewalId = this.parseId(id);
    return this.prisma.$transaction(async (tx) => {
      const renewal = await this.lockPendingRenewal(tx, renewalId);
      const decision = observacoes?.trim() || `Decisão registrada: ${status}.`;
      await tx.renovacao.update({
        where: { id: renewalId },
        data: {
          status,
          observacoes: this.appendObservation(
            renewal.observacoes,
            this.historyEntry('DECISAO', userId, `${status}: ${decision}`),
          ),
        },
      });
      return { status };
    });
  }

  private async cleanup(keys: string[]) {
    for (const key of keys) {
      try {
        await this.storage.deleteObject(key);
      } catch (error) {
        this.logger.error(`Falha ao remover arquivo não utilizado: ${key}`, error);
      }
    }
  }
}
