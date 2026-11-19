import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import * as request from 'supertest';
import { USER_ROLES, UserRole } from '../../common/constants/user-roles';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { MatriculaModule } from '../matricula/matricula.module';
import { DocumentoModule } from './documento.module';

describe('DocumentoModule', () => {
  let app: INestApplication;
  const jwt = new JwtService();
  const prisma = {
    etapaCatequetica: { findFirst: jest.fn() },
    matricula: { create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
    documento: { create: jest.fn(), update: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    matriculaDecisao: { create: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  const documento = {
    id: 9007199254740993n, matriculaId: 7n, nomeArquivo: 'certidao.pdf',
    tipoDocumento: 'CERTIDAO_NASCIMENTO', status: 'PENDENTE', parecer: null,
    dataEnvio: new Date('2026-01-01T00:00:00.000Z'),
  };
  const token = (perfis: UserRole[], id = '42') => jwt.sign(
    { sub: id, email: 'user@example.com', perfis, tokenUse: 'access' },
    { secret: 'test-secret' },
  );
  const auth = (perfis: UserRole[], id?: string) => `Bearer ${token(perfis, id)}`;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [DocumentoModule, MatriculaModule],
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: { get: () => 'test-secret' } },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).overrideProvider(PrismaService).useValue(prisma).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true, forbidNonWhitelisted: true, transform: true,
      transformOptions: { enableImplicitConversion: true },
    }));
    await app.init();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((fn) => fn(prisma));
    prisma.$queryRaw.mockResolvedValue([{ status: 'PENDENTE' }]);
    prisma.matricula.findUnique.mockResolvedValue({ id: 7n });
    prisma.matricula.findFirst.mockResolvedValue({ id: 7n });
    prisma.documento.create.mockResolvedValue(documento);
    prisma.documento.findMany.mockResolvedValue([documento]);
    prisma.documento.findFirst.mockResolvedValue(documento);
    prisma.documento.update.mockImplementation(async ({ data }) => ({ ...documento, ...data }));
    prisma.matriculaDecisao.create.mockResolvedValue({});
    prisma.matricula.findMany.mockResolvedValue([]);
  });

  afterAll(async () => { await app.close(); });

  it('exige autenticação e registra documento e histórico para a Secretaria', async () => {
    const body = { nomeArquivo: ' certidao.pdf ', tipoDocumento: 'CERTIDAO_NASCIMENTO' };
    await request(app.getHttpServer()).post('/api/matriculas/7/documentos').send(body).expect(401);
    await request(app.getHttpServer()).post('/api/matriculas/7/documentos')
      .set('Authorization', auth([USER_ROLES.RESPONSAVEL])).send(body).expect(403);
    const response = await request(app.getHttpServer()).post('/api/matriculas/7/documentos')
      .set('Authorization', auth([USER_ROLES.SECRETARIA])).send(body).expect(201);
    expect(response.body).toEqual({ ...documento, id: '9007199254740993', matriculaId: '7', dataEnvio: '2026-01-01T00:00:00.000Z' });
    expect(prisma.documento.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { matriculaId: 7n, nomeArquivo: 'certidao.pdf', tipoDocumento: 'CERTIDAO_NASCIMENTO', status: 'PENDENTE', parecer: null },
    }));
    expect(prisma.matriculaDecisao.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        matriculaId: 7n, usuarioId: 42n, etapa: 'SECRETARIA', resultado: 'DOCUMENTO_ADICIONADO',
        parecer: expect.stringContaining('certidao.pdf'),
      }),
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    const [query, id] = prisma.$queryRaw.mock.calls[0];
    expect(query.join('?')).toMatch(/FOR UPDATE/i);
    expect(id).toBe(7n);
  });

  it.each([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDENADOR, USER_ROLES.SECRETARIA])(
    'permite a %s consultar documentos sem vínculo de responsável',
    async (role) => {
      await request(app.getHttpServer()).get('/api/matriculas/7/documentos')
        .set('Authorization', auth([role])).expect(200);
      expect(prisma.matricula.findFirst).toHaveBeenCalledWith({ where: { id: 7n }, select: { id: true } });
    },
  );

  it('limita consulta do responsável a matrícula aprovada e vinculada ao usuário', async () => {
    const response = await request(app.getHttpServer()).get('/api/matriculas/7/documentos')
      .set('Authorization', auth([USER_ROLES.RESPONSAVEL])).expect(200);
    expect(response.body[0].id).toBe('9007199254740993');
    expect(prisma.matricula.findFirst).toHaveBeenCalledWith({
      where: { id: 7n, status: 'APROVADA', responsavel: { usuarioId: 42n } },
      select: { id: true },
    });
    prisma.matricula.findFirst.mockResolvedValueOnce(null);
    await request(app.getHttpServer()).get('/api/matriculas/7/documentos')
      .set('Authorization', auth([USER_ROLES.RESPONSAVEL], '43')).expect(404);
    expect(prisma.documento.findMany).toHaveBeenCalledTimes(1);
  });

  it('nega leitura anônima ou de outros perfis', async () => {
    await request(app.getHttpServer()).get('/api/matriculas/7/documentos').expect(401);
    await request(app.getHttpServer()).get('/api/matriculas/7/documentos')
      .set('Authorization', auth([USER_ROLES.CATEQUISTA])).expect(403);
    expect(prisma.documento.findMany).not.toHaveBeenCalled();
  });

  it('consulta documento pela matrícula e rejeita outro documento', async () => {
    await request(app.getHttpServer()).get('/api/matriculas/7/documentos/9007199254740993')
      .set('Authorization', auth([USER_ROLES.RESPONSAVEL])).expect(200);
    expect(prisma.documento.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 9007199254740993n, matriculaId: 7n },
    }));
    prisma.documento.findFirst.mockResolvedValueOnce(null);
    await request(app.getHttpServer()).get('/api/matriculas/7/documentos/8')
      .set('Authorization', auth([USER_ROLES.RESPONSAVEL])).expect(404);
  });

  it('rejeita matrícula inexistente e IDs inválidos', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]);
    await request(app.getHttpServer()).post('/api/matriculas/7/documentos')
      .set('Authorization', auth([USER_ROLES.SECRETARIA]))
      .send({ nomeArquivo: 'a.pdf', tipoDocumento: 'CERTIFICADO_BATISMO' }).expect(404);
    await request(app.getHttpServer()).get('/api/matriculas/9223372036854775808/documentos')
      .set('Authorization', auth([USER_ROLES.SECRETARIA])).expect(400);
    await request(app.getHttpServer()).get('/api/matriculas/7/documentos/0')
      .set('Authorization', auth([USER_ROLES.SECRETARIA])).expect(400);
    expect(prisma.documento.create).not.toHaveBeenCalled();
  });

  it('substitui metadados, reinicia análise e registra histórico sem mudar matrícula', async () => {
    prisma.documento.findFirst.mockResolvedValueOnce({ ...documento, status: 'REJEITADO', parecer: 'Ilegível' });
    const response = await request(app.getHttpServer()).put('/api/matriculas/7/documentos/9007199254740993/substituicao')
      .set('Authorization', auth([USER_ROLES.SECRETARIA], '9007199254740994'))
      .send({ nomeArquivo: ' novo.pdf ', observacao: 'Atendimento presencial.' }).expect(200);
    expect(response.body).toMatchObject({ id: '9007199254740993', nomeArquivo: 'novo.pdf', status: 'PENDENTE', parecer: null });
    expect(prisma.documento.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { nomeArquivo: 'novo.pdf', status: 'PENDENTE', parecer: null, dataEnvio: expect.any(Date) },
    }));
    expect(prisma.matriculaDecisao.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        usuarioId: 9007199254740994n, resultado: 'DOCUMENTO_SUBSTITUIDO',
        parecer: expect.stringContaining('certidao.pdf → novo.pdf'),
      }),
    });
    expect(prisma.matriculaDecisao.create.mock.calls[0][0].data.parecer).toContain('Atendimento presencial.');
    expect(prisma.matricula.findUnique).not.toHaveBeenCalled();
    expect(prisma.matricula.updateMany).not.toHaveBeenCalled();
  });

  it('atualiza status e parecer e registra valores no histórico', async () => {
    const response = await request(app.getHttpServer()).patch('/api/matriculas/7/documentos/9007199254740993')
      .set('Authorization', auth([USER_ROLES.SECRETARIA]))
      .send({ status: 'REJEITADO', parecer: ' Ilegível ' }).expect(200);
    expect(response.body).toMatchObject({ status: 'REJEITADO', parecer: 'Ilegível' });
    expect(prisma.matriculaDecisao.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        resultado: 'DOCUMENTO_ATUALIZADO',
        parecer: expect.stringContaining('Status: PENDENTE → REJEITADO.'),
      }),
    });
    expect(prisma.matriculaDecisao.create.mock.calls[0][0].data.parecer).toContain('Ilegível');
    expect(prisma.matricula.updateMany).not.toHaveBeenCalled();
  });

  it('permite limpar parecer sem alterar status', async () => {
    await request(app.getHttpServer()).patch('/api/matriculas/7/documentos/9007199254740993')
      .set('Authorization', auth([USER_ROLES.SECRETARIA])).send({ parecer: ' ' }).expect(200);
    expect(prisma.documento.update).toHaveBeenCalledWith(expect.objectContaining({ data: { parecer: null } }));
  });

  it.each(['PENDENTE', 'AGUARDANDO_COORDENADOR'])('permite operação no status %s', async (status) => {
    prisma.$queryRaw.mockResolvedValue([{ status }]);
    await request(app.getHttpServer()).post('/api/matriculas/7/documentos')
      .set('Authorization', auth([USER_ROLES.ADMINISTRADOR]))
      .send({ nomeArquivo: 'a.pdf', tipoDocumento: 'CERTIFICADO_BATISMO' }).expect(201);
  });

  it.each(['PENDENCIA_DOCUMENTAL', 'APROVADA', 'REJEITADA'])('bloqueia operação no status %s', async (status) => {
    prisma.$queryRaw.mockResolvedValue([{ status }]);
    await request(app.getHttpServer()).post('/api/matriculas/7/documentos')
      .set('Authorization', auth([USER_ROLES.SECRETARIA]))
      .send({ nomeArquivo: 'a.pdf', tipoDocumento: 'CERTIFICADO_BATISMO' }).expect(409);
    expect(prisma.documento.create).not.toHaveBeenCalled();
    expect(prisma.matriculaDecisao.create).not.toHaveBeenCalled();
  });

  it('nega ao catequista a substituição e atualização', async () => {
    await request(app.getHttpServer()).put('/api/matriculas/7/documentos/8/substituicao')
      .set('Authorization', auth([USER_ROLES.CATEQUISTA])).send({ nomeArquivo: 'a.pdf' }).expect(403);
    await request(app.getHttpServer()).patch('/api/matriculas/7/documentos/8')
      .set('Authorization', auth([USER_ROLES.CATEQUISTA])).send({ status: 'PENDENTE' }).expect(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(['PENDENTE', 'AGUARDANDO_COORDENADOR'])(
    'coordenador adiciona, substitui e atualiza documentos em %s',
    async (status) => {
      prisma.$queryRaw.mockResolvedValue([{ status }]);
      await request(app.getHttpServer()).post('/api/matriculas/7/documentos')
        .set('Authorization', auth([USER_ROLES.COORDENADOR], '99'))
        .send({ nomeArquivo: 'certidao.pdf', tipoDocumento: 'CERTIDAO_NASCIMENTO' }).expect(201);
      await request(app.getHttpServer()).put('/api/matriculas/7/documentos/9007199254740993/substituicao')
        .set('Authorization', auth([USER_ROLES.COORDENADOR], '99'))
        .send({ nomeArquivo: 'novo.pdf' }).expect(200);
      await request(app.getHttpServer()).patch('/api/matriculas/7/documentos/9007199254740993')
        .set('Authorization', auth([USER_ROLES.COORDENADOR], '99'))
        .send({ status: 'REJEITADO', parecer: 'Ilegível' }).expect(200);
      expect(prisma.matriculaDecisao.create.mock.calls.map(([args]) => ({
        etapa: args.data.etapa, usuarioId: args.data.usuarioId, resultado: args.data.resultado,
      }))).toEqual([
        { etapa: 'SECRETARIA', usuarioId: 99n, resultado: 'DOCUMENTO_ADICIONADO' },
        { etapa: 'SECRETARIA', usuarioId: 99n, resultado: 'DOCUMENTO_SUBSTITUIDO' },
        { etapa: 'SECRETARIA', usuarioId: 99n, resultado: 'DOCUMENTO_ATUALIZADO' },
      ]);
      expect(prisma.matricula.updateMany).not.toHaveBeenCalled();
    },
  );

  it('não permite substituir ou atualizar documentos após decisão final', async () => {
    prisma.$queryRaw.mockResolvedValue([{ status: 'APROVADA' }]);
    await request(app.getHttpServer()).put('/api/matriculas/7/documentos/8/substituicao')
      .set('Authorization', auth([USER_ROLES.SECRETARIA])).send({ nomeArquivo: 'a.pdf' }).expect(409);
    await request(app.getHttpServer()).patch('/api/matriculas/7/documentos/8')
      .set('Authorization', auth([USER_ROLES.SECRETARIA])).send({ status: 'PENDENTE' }).expect(409);
    expect(prisma.documento.update).not.toHaveBeenCalled();
    expect(prisma.matriculaDecisao.create).not.toHaveBeenCalled();
  });

  it('não altera documento de outra matrícula nem cria histórico', async () => {
    prisma.documento.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer()).patch('/api/matriculas/7/documentos/8')
      .set('Authorization', auth([USER_ROLES.SECRETARIA])).send({ status: 'PENDENTE' }).expect(404);
    expect(prisma.documento.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 8n, matriculaId: 7n } }));
    expect(prisma.documento.update).not.toHaveBeenCalled();
    expect(prisma.matriculaDecisao.create).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { status: 'INVALIDO' },
    { parecer: null },
    { parecer: 'x'.repeat(1001) },
    { status: 'PENDENTE', campoExtra: true },
  ])('rejeita atualização inválida %p', async (body) => {
    await request(app.getHttpServer()).patch('/api/matriculas/7/documentos/8')
      .set('Authorization', auth([USER_ROLES.SECRETARIA])).send(body).expect(400);
    expect(prisma.documento.update).not.toHaveBeenCalled();
  });

  it('propaga falha do histórico na transação, sem retornar sucesso', async () => {
    prisma.matriculaDecisao.create.mockRejectedValue(new Error('falha ao registrar histórico'));
    await request(app.getHttpServer()).post('/api/matriculas/7/documentos')
      .set('Authorization', auth([USER_ROLES.SECRETARIA]))
      .send({ nomeArquivo: 'a.pdf', tipoDocumento: 'CERTIFICADO_BATISMO' }).expect(500);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('informa conflito de concorrência em transação serializável', async () => {
    prisma.$transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('conflito', {
      code: 'P2034', clientVersion: 'test',
    }));
    await request(app.getHttpServer()).post('/api/matriculas/7/documentos')
      .set('Authorization', auth([USER_ROLES.SECRETARIA]))
      .send({ nomeArquivo: 'a.pdf', tipoDocumento: 'CERTIFICADO_BATISMO' }).expect(409);
  });

  it('exercita operação, observação e aprovação pelo coordenador com persistência simulada', async () => {
    let status = 'PENDENTE';
    let dadosMatricula: Record<string, unknown> = {};
    const documentos = [
      { ...documento, id: 1n },
      { ...documento, id: 2n, tipoDocumento: 'COMPROVANTE_ENDERECO', nomeArquivo: 'endereco.pdf' },
    ];
    const decisoes: { id: bigint; usuarioId: bigint; etapa: string; resultado: string; parecer: string; decididoEm: Date; usuario: { nome: string } }[] = [];
    prisma.etapaCatequetica.findFirst.mockResolvedValue({ id: 1n });
    prisma.matricula.create.mockImplementation(async ({ data }) => {
      dadosMatricula = { ...data, id: 7n, dataSolicitacao: new Date('2026-01-01T00:00:00Z'), etapa: { id: 1n, nome: 'Primeira Eucaristia I' } };
      return { id: 7n, status, dataSolicitacao: dadosMatricula.dataSolicitacao };
    });
    prisma.$queryRaw.mockImplementation(async () => [{ status }]);
    prisma.documento.create.mockImplementation(async ({ data }) => {
      const novo = { ...documento, ...data, id: 3n };
      documentos.push(novo);
      return novo;
    });
    prisma.documento.findFirst.mockImplementation(async ({ where }) => documentos.find((doc) => doc.id === where.id && doc.matriculaId === where.matriculaId) ?? null);
    prisma.documento.update.mockImplementation(async ({ where, data }) => {
      const indice = documentos.findIndex((doc) => doc.id === where.id);
      documentos[indice] = { ...documentos[indice], ...data };
      return documentos[indice];
    });
    prisma.matriculaDecisao.create.mockImplementation(async ({ data }) => {
      const decisao = { ...data, id: BigInt(decisoes.length + 10), decididoEm: new Date(), usuario: { nome: 'Secretaria de teste' } };
      decisoes.push(decisao);
      return { id: decisao.id, etapa: decisao.etapa, resultado: decisao.resultado, parecer: decisao.parecer, decididoEm: decisao.decididoEm };
    });
    prisma.matricula.findUnique.mockImplementation(async () => ({
      ...dadosMatricula, status, documentos, decisoes: decisoes.filter((decisao) => decisao.etapa === 'SECRETARIA'),
    }));
    prisma.matricula.updateMany.mockImplementation(async ({ where, data }) => {
      if (!where.status.in.includes(status)) return { count: 0 };
      status = data.status;
      return { count: 1 };
    });

    await request(app.getHttpServer()).post('/api/matriculas').send({
      responsavelNome: 'Maria Silva', responsavelCpf: '12345678900', responsavelParentesco: 'Mãe',
      responsavelDataNascimento: '1980-05-10', responsavelTelefone: '11999999999',
      responsavelWhatsapp: '11999999999', responsavelEmail: 'maria@example.com',
      catequizandoNome: 'Ana Silva', catequizandoDataNascimento: '2015-03-20',
      catequizandoEndereco: 'Rua Exemplo, 10', catequizandoTelefoneEmergencia: '11988888888',
      etapaId: '1', documentos: [
        { nomeArquivo: 'certidao.pdf', tipoDocumento: 'CERTIDAO_NASCIMENTO' },
        { nomeArquivo: 'endereco.pdf', tipoDocumento: 'COMPROVANTE_ENDERECO' },
      ],
    }).expect(201);
    await request(app.getHttpServer()).post('/api/matriculas/7/documentos')
      .set('Authorization', auth([USER_ROLES.SECRETARIA]))
      .send({ nomeArquivo: 'batismo.pdf', tipoDocumento: 'CERTIFICADO_BATISMO' }).expect(201);
    await request(app.getHttpServer()).put('/api/matriculas/7/documentos/3/substituicao')
      .set('Authorization', auth([USER_ROLES.COORDENADOR]))
      .send({ nomeArquivo: 'batismo-novo.pdf', observacao: 'Atendimento presencial.' }).expect(200);
    await request(app.getHttpServer()).post('/api/matriculas/7/parecer-secretaria')
      .set('Authorization', auth([USER_ROLES.COORDENADOR]))
      .send({ resultado: 'OBSERVACAO', parecer: 'Dados conferidos presencialmente.' }).expect(201);
    const detalhe = await request(app.getHttpServer()).get('/api/matriculas/7')
      .set('Authorization', auth([USER_ROLES.COORDENADOR])).expect(200);
    expect(detalhe.body.status).toBe('PENDENTE');
    expect(detalhe.body.documentos).toEqual(expect.arrayContaining([expect.objectContaining({ id: '3', nomeArquivo: 'batismo-novo.pdf' })]));
    expect(detalhe.body.analisesSecretaria).toEqual([
      expect.objectContaining({ resultado: 'DOCUMENTO_ADICIONADO', usuarioNome: 'Secretaria de teste' }),
      expect.objectContaining({ resultado: 'DOCUMENTO_SUBSTITUIDO', parecer: expect.stringContaining('Atendimento presencial.') }),
      expect.objectContaining({ resultado: 'OBSERVACAO', parecer: 'Dados conferidos presencialmente.' }),
    ]);
    await request(app.getHttpServer()).post('/api/matriculas/7/decisao-coordenador')
      .set('Authorization', auth([USER_ROLES.COORDENADOR]))
      .send({ resultado: 'APROVADA', parecer: 'Documentação conferida.' }).expect(201);
    expect(status).toBe('APROVADA');
  });

  it.each([
    { nomeArquivo: '', tipoDocumento: 'CERTIDAO_NASCIMENTO' },
    { nomeArquivo: 12, tipoDocumento: 'CERTIDAO_NASCIMENTO' },
    { nomeArquivo: 'a.pdf', tipoDocumento: 'INVALIDO' },
    { nomeArquivo: 'a.pdf', tipoDocumento: 'CERTIFICADO_BATISMO', status: 'APROVADO' },
    { nomeArquivo: 'a.pdf', tipoDocumento: 'CERTIFICADO_BATISMO', parecer: 'aprovado' },
  ])('rejeita metadados inválidos ou parecer/status enviados pelo cliente: %p', async (body) => {
    await request(app.getHttpServer()).post('/api/matriculas/7/documentos')
      .set('Authorization', auth([USER_ROLES.SECRETARIA])).send(body).expect(400);
    expect(prisma.documento.create).not.toHaveBeenCalled();
  });

  it('lista apenas matrículas aprovadas vinculadas ao responsável', async () => {
    prisma.matricula.findMany.mockResolvedValue([{
      id: 7n, status: 'APROVADA', catequizandoNome: 'Ana', dataSolicitacao: null,
      etapa: { id: 2n, nome: 'Nível I' },
    }]);
    const response = await request(app.getHttpServer()).get('/api/matriculas/minhas')
      .set('Authorization', auth([USER_ROLES.RESPONSAVEL])).expect(200);
    expect(response.body[0]).toMatchObject({ id: '7', etapa: { id: '2' } });
    expect(prisma.matricula.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'APROVADA', responsavel: { usuarioId: 42n } },
    }));
    await request(app.getHttpServer()).get('/api/matriculas/minhas')
      .set('Authorization', auth([USER_ROLES.CATEQUISTA])).expect(403);
  });
});
