import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import * as request from 'supertest';
import { USER_ROLES, UserRole } from '../../common/constants/user-roles';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { MatriculaModule } from './matricula.module';

describe('Matrícula MVP', () => {
  let app: INestApplication;
  const jwt = new JwtService();
  const prisma = {
    etapaCatequetica: { findMany: jest.fn(), findFirst: jest.fn() },
    matricula: { create: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const token = (perfis: UserRole[], id = '42') => jwt.sign(
    { sub: id, email: 'user@example.com', perfis, tokenUse: 'access' },
    { secret: 'test-secret' },
  );
  const auth = (perfis: UserRole[], id?: string) => `Bearer ${token(perfis, id)}`;
  const payload = {
    responsavelNome: ' Maria Silva ',
    responsavelCpf: '123.456.789-00',
    responsavelParentesco: 'Mãe',
    responsavelDataNascimento: '1980-05-10',
    responsavelTelefone: '11999999999',
    responsavelWhatsapp: '11999999999',
    responsavelEmail: 'maria@example.com',
    catequizandoNome: 'Ana Silva',
    catequizandoDataNascimento: '2015-03-20',
    catequizandoEndereco: 'Rua Exemplo, 10',
    catequizandoTelefoneEmergencia: '11988888888',
    etapaId: '9007199254740993',
    observacao: 'Observação',
    documentos: [
      { nomeArquivo: 'certidao.pdf', tipoDocumento: 'CERTIDAO_NASCIMENTO' },
      { nomeArquivo: 'endereco.pdf', tipoDocumento: 'COMPROVANTE_ENDERECO' },
      { nomeArquivo: 'batismo.pdf', tipoDocumento: 'CERTIFICADO_BATISMO' },
    ],
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [MatriculaModule],
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
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }));
    await app.init();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
    prisma.etapaCatequetica.findFirst.mockResolvedValue({ id: 9007199254740993n });
    prisma.matricula.findMany.mockResolvedValue([]);
    prisma.matricula.create.mockResolvedValue({
      id: 9007199254740995n, status: 'PENDENTE', dataSolicitacao: new Date('2026-01-01T00:00:00Z'),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('lista apenas etapas ativas e serializa IDs sem perda de precisão', async () => {
    prisma.etapaCatequetica.findMany.mockResolvedValue([
      { id: 9007199254740993n, nome: 'Nível I', descricao: null, ordem: 1 },
    ]);
    const response = await request(app.getHttpServer()).get('/api/etapas').expect(200);
    expect(response.body).toEqual([{ id: '9007199254740993', nome: 'Nível I', descricao: null, ordem: 1 }]);
    expect(prisma.etapaCatequetica.findMany).toHaveBeenCalledWith({
      where: { ativa: true },
      select: { id: true, nome: true, descricao: true, ordem: true },
      orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
    });
  });

  it('exige autenticação e restringe a listagem à equipe responsável', async () => {
    await request(app.getHttpServer()).get('/api/matriculas').expect(401);
    await request(app.getHttpServer()).get('/api/matriculas')
      .set('Authorization', auth([USER_ROLES.RESPONSAVEL]))
      .expect(403);
    expect(prisma.matricula.findMany).not.toHaveBeenCalled();
  });

  it.each([USER_ROLES.ADMINISTRADOR, USER_ROLES.SECRETARIA, USER_ROLES.COORDENADOR])(
    'lista matrículas para o perfil %s, serializa BigInt e retorna somente os campos públicos previstos',
    async (perfil) => {
      prisma.matricula.findMany.mockResolvedValue([{
        id: 9007199254740995n,
        status: 'PENDENTE',
        dataSolicitacao: new Date('2026-02-03T10:30:00.000Z'),
        responsavelNome: 'Maria Silva',
        responsavelCpf: '123.456.789-00',
        responsavelParentesco: 'Mãe',
        responsavelDataNascimento: new Date('1980-05-10T00:00:00.000Z'),
        responsavelTelefone: '11999999999',
        responsavelWhatsapp: '11999999999',
        responsavelEmail: 'maria@example.com',
        catequizandoNome: 'Ana Silva',
        catequizandoDataNascimento: new Date('2015-03-20T00:00:00.000Z'),
        catequizandoEndereco: 'Rua Exemplo, 10',
        catequizandoTelefoneEmergencia: '11988888888',
        etapa: { id: 9007199254740993n, nome: 'Primeira Eucaristia I' },
      }]);

      const response = await request(app.getHttpServer()).get('/api/matriculas')
        .set('Authorization', auth([perfil]))
        .expect(200);

      expect(response.body).toEqual([{
        protocolo: '9007199254740995',
        responsavel: {
          nome: 'Maria Silva',
          cpf: '123.456.789-00',
          parentesco: 'Mãe',
          dataNascimento: '1980-05-10T00:00:00.000Z',
          telefone: '11999999999',
          whatsapp: '11999999999',
          email: 'maria@example.com',
        },
        catequizando: {
          nome: 'Ana Silva',
          dataNascimento: '2015-03-20T00:00:00.000Z',
          endereco: 'Rua Exemplo, 10',
          telefoneEmergencia: '11988888888',
        },
        etapa: { id: '9007199254740993', nome: 'Primeira Eucaristia I' },
        status: 'PENDENTE',
        dataSolicitacao: '2026-02-03T10:30:00.000Z',
      }]);
      expect(prisma.matricula.findMany).toHaveBeenCalledWith({
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
        },
        orderBy: [{ dataSolicitacao: 'desc' }, { id: 'desc' }],
      });
    },
  );

  it('cria matrícula pendente com todos os dados e responde sem expor dados pessoais', async () => {
    const response = await request(app.getHttpServer()).post('/api/matriculas').send(payload).expect(201);
    expect(response.body).toEqual({
      id: '9007199254740995', status: 'PENDENTE', dataSolicitacao: '2026-01-01T00:00:00.000Z',
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(prisma.etapaCatequetica.findFirst).toHaveBeenCalledWith({
      where: { id: 9007199254740993n, ativa: true }, select: { id: true },
    });
    expect(prisma.matricula.create).toHaveBeenCalledWith({
      data: {
        ...payload,
        responsavelNome: 'Maria Silva',
        responsavelDataNascimento: new Date('1980-05-10T00:00:00.000Z'),
        catequizandoDataNascimento: new Date('2015-03-20T00:00:00.000Z'),
        etapaId: 9007199254740993n,
        status: 'PENDENTE',
        documentos: {
          create: payload.documentos.map((documento) => ({
            ...documento, status: 'PENDENTE', parecer: null,
          })),
        },
      },
      select: { id: true, status: true, dataSolicitacao: true },
    });
  });

  it('rejeita etapa inexistente ou inativa sem criar matrícula', async () => {
    prisma.etapaCatequetica.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer()).post('/api/matriculas').send(payload).expect(400);
    expect(prisma.matricula.create).not.toHaveBeenCalled();
  });

  it.each([
    'responsavelNome', 'responsavelEmail', 'responsavelCpf', 'responsavelParentesco',
    'responsavelDataNascimento', 'responsavelTelefone', 'responsavelWhatsapp',
    'catequizandoNome', 'catequizandoDataNascimento', 'catequizandoEndereco',
    'catequizandoTelefoneEmergencia', 'etapaId', 'documentos',
  ])('rejeita a ausência do campo obrigatório %s', async (campo) => {
    const incomplete = { ...payload };
    delete incomplete[campo];
    await request(app.getHttpServer()).post('/api/matriculas').send(incomplete).expect(400);
    expect(prisma.matricula.create).not.toHaveBeenCalled();
  });

  it.each([
    { responsavelNome: '   ' },
    { responsavelNome: 123 },
    { responsavelEmail: 'invalido' },
    { responsavelEmail: { valor: 'maria@example.com' } },
    { responsavelCpf: ' '.repeat(5) },
    { responsavelDataNascimento: '1980-02-30' },
    { catequizandoDataNascimento: '2015-13-20' },
    { catequizandoDataNascimento: 20150320 },
    { etapaId: '9223372036854775808' },
    { etapaId: 9007199254740992 },
    { etapaId: '0' },
    { status: 'APROVADA' },
    { responsavelId: '1' },
    { documentos: [] },
    { documentos: [payload.documentos[0], payload.documentos[0], payload.documentos[2]] },
    { documentos: [payload.documentos[0], payload.documentos[1], { nomeArquivo: 'x', tipoDocumento: 'INVALIDO' }] },
    { documentos: [payload.documentos[0], payload.documentos[1], { nomeArquivo: '   ', tipoDocumento: 'CERTIFICADO_BATISMO' }] },
    { documentos: [payload.documentos[0], payload.documentos[1], { ...payload.documentos[2], status: 'APROVADO' }] },
    { documentos: [payload.documentos[0], payload.documentos[1], null] },
  ])('rejeita entrada inválida ou campos controlados pelo servidor: %p', async (invalid) => {
    await request(app.getHttpServer()).post('/api/matriculas').send({ ...payload, ...invalid }).expect(400);
    expect(prisma.matricula.create).not.toHaveBeenCalled();
  });

  it('aceita ausência de observação', async () => {
    const withoutObservacao = { ...payload };
    delete withoutObservacao.observacao;
    await request(app.getHttpServer()).post('/api/matriculas').send(withoutObservacao).expect(201);
    expect(prisma.matricula.create.mock.calls[0][0].data.observacao).toBeNull();
  });
});
