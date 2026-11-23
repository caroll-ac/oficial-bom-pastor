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
import { AuthService } from '../auth/auth.service';
import { MailerService } from '../../common/mailer/mailer.service';

describe('Matrícula MVP', () => {
  let app: INestApplication;
  const jwt = new JwtService();
  const prisma = {
    etapaCatequetica: { findMany: jest.fn(), findFirst: jest.fn() },
    matricula: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
    matriculaDecisao: { create: jest.fn() },
    usuario: { findMany: jest.fn(), create: jest.fn() },
    perfil: { findUnique: jest.fn() },
    catequizando: { findFirst: jest.fn(), create: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  const mailer = { sendMail: jest.fn() };
  const authService = { sendPasswordSetupInvite: jest.fn() };
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
    })
      .overrideProvider(PrismaService).useValue(prisma)
      .overrideProvider(AuthService).useValue(authService)
      .overrideProvider(MailerService).useValue(mailer)
      .overrideProvider(ConfigService).useValue({ get: (key: string) => key === 'FRONTEND_URL' ? 'http://localhost:5173' : 'test-secret' })
      .compile();
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
    prisma.matricula.findUniqueOrThrow.mockResolvedValue({
      responsavelEmail: 'maria@example.com', responsavelCpf: '123.456.789-00',
      catequizandoNome: 'Ana Silva', catequizandoDataNascimento: new Date('2015-03-20'),
      catequizandoEndereco: 'Rua Exemplo', catequizandoTelefoneEmergencia: '11999999999',
    });
    prisma.usuario.findMany.mockResolvedValue([{
      id: 8n, ativo: true, responsavel: { id: 9n, cpf: '12345678900' },
      perfis: [{ perfil: { nome: 'RESPONSAVEL' } }],
    }]);
    prisma.matricula.findUnique.mockResolvedValue({
      status: 'APROVADA', catequizandoNome: 'Ana Silva',
      responsavel: { usuario: { id: 8n, ativo: true, primeiroAcesso: false, nome: 'Maria', email: 'maria@example.com' } },
    });
    prisma.catequizando.findFirst.mockResolvedValue(null);
    mailer.sendMail.mockResolvedValue({});
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

  describe('GET /api/matriculas/:id', () => {
    const registro = {
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
      documentos: [
        {
          id: 9007199254740996n,
          nomeArquivo: 'certidao.pdf',
          tipoDocumento: 'CERTIDAO_NASCIMENTO',
          status: 'PENDENTE',
          parecer: null,
          dataEnvio: new Date('2026-02-03T10:30:00.000Z'),
        },
        {
          id: 9007199254740997n,
          nomeArquivo: 'endereco.pdf',
          tipoDocumento: 'COMPROVANTE_ENDERECO',
          status: 'PENDENTE',
          parecer: null,
          dataEnvio: null,
        },
      ],
      decisoes: [
        {
          id: 9007199254740998n,
          resultado: 'PENDENCIA_DOCUMENTAL',
          parecer: 'Falta comprovante.',
          decididoEm: new Date('2026-02-04T09:00:00.000Z'),
          usuarioId: 9007199254740999n,
        },
        {
          id: 9007199254741000n,
          resultado: 'DOCUMENTACAO_OK',
          parecer: 'Documentação conferida.',
          decididoEm: new Date('2026-02-05T09:00:00.000Z'),
          usuarioId: 7n,
        },
      ],
    };

    it('exige autenticação e restringe o detalhe à equipe responsável', async () => {
      await request(app.getHttpServer()).get('/api/matriculas/1').expect(401);
      await request(app.getHttpServer()).get('/api/matriculas/1')
        .set('Authorization', auth([USER_ROLES.RESPONSAVEL]))
        .expect(403);
      expect(prisma.matricula.findUnique).not.toHaveBeenCalled();
    });

    it.each(['abc', '0', '-1', '1.5', '9223372036854775808'])('rejeita id inválido %s com 400', async (id) => {
      await request(app.getHttpServer()).get(`/api/matriculas/${id}`)
        .set('Authorization', auth([USER_ROLES.SECRETARIA]))
        .expect(400);
      expect(prisma.matricula.findUnique).not.toHaveBeenCalled();
    });

    it('não captura /matriculas/minhas como id', async () => {
      await request(app.getHttpServer()).get('/api/matriculas/minhas')
        .set('Authorization', auth([USER_ROLES.SECRETARIA]))
        .expect(403);
      expect(prisma.matricula.findUnique).not.toHaveBeenCalled();
    });

    it('retorna 404 quando a matrícula não existe', async () => {
      prisma.matricula.findUnique.mockResolvedValue(null);
      await request(app.getHttpServer()).get('/api/matriculas/99')
        .set('Authorization', auth([USER_ROLES.SECRETARIA]))
        .expect(404);
    });

    it.each([USER_ROLES.ADMINISTRADOR, USER_ROLES.SECRETARIA, USER_ROLES.COORDENADOR])(
      'detalha a matrícula para %s com BigInt serializado e sem campos internos',
      async (perfil) => {
        prisma.matricula.findUnique.mockResolvedValue(registro);

        const response = await request(app.getHttpServer()).get('/api/matriculas/9007199254740995')
          .set('Authorization', auth([perfil]))
          .expect(200);

        expect(response.body).toEqual({
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
          documentos: [
            {
              id: '9007199254740996',
              nomeArquivo: 'certidao.pdf',
              tipoDocumento: 'CERTIDAO_NASCIMENTO',
              status: 'PENDENTE',
              parecer: null,
              dataEnvio: '2026-02-03T10:30:00.000Z',
            },
            {
              id: '9007199254740997',
              nomeArquivo: 'endereco.pdf',
              tipoDocumento: 'COMPROVANTE_ENDERECO',
              status: 'PENDENTE',
              parecer: null,
              dataEnvio: null,
            },
          ],
          analisesSecretaria: [
            {
              id: '9007199254740998',
              resultado: 'PENDENCIA_DOCUMENTAL',
              parecer: 'Falta comprovante.',
              decididoEm: '2026-02-04T09:00:00.000Z',
              usuarioId: '9007199254740999',
            },
            {
              id: '9007199254741000',
              resultado: 'DOCUMENTACAO_OK',
              parecer: 'Documentação conferida.',
              decididoEm: '2026-02-05T09:00:00.000Z',
              usuarioId: '7',
            },
          ],
        });
        expect(response.body).not.toHaveProperty('observacao');
        expect(response.body).not.toHaveProperty('decisoes');
        expect(response.body).not.toHaveProperty('dataAprovacao');
        expect(response.body).not.toHaveProperty('responsavelId');
      },
    );

    it('consulta uma única vez com documentos ordenados por id e sem campos internos', async () => {
      prisma.matricula.findUnique.mockResolvedValue(registro);
      await request(app.getHttpServer()).get('/api/matriculas/9007199254740995')
        .set('Authorization', auth([USER_ROLES.SECRETARIA]))
        .expect(200);

      expect(prisma.matricula.findUnique).toHaveBeenCalledTimes(1);
      const args = prisma.matricula.findUnique.mock.calls[0][0];
      expect(args.where).toEqual({ id: 9007199254740995n });
      expect(args.select.documentos.orderBy).toEqual({ id: 'asc' });
      expect(args.select.etapa).toEqual({ select: { id: true, nome: true } });
      expect(args.select.decisoes).toEqual({
        where: { etapa: 'SECRETARIA' },
        select: { id: true, resultado: true, parecer: true, decididoEm: true, usuarioId: true },
        orderBy: [{ decididoEm: 'asc' }, { id: 'asc' }],
      });
      for (const campo of ['observacao', 'dataAprovacao', 'responsavelId', 'responsavel', 'catequizando']) {
        expect(args.select).not.toHaveProperty(campo);
      }
    });

    it('retorna lista vazia quando não há análises da Secretaria', async () => {
      prisma.matricula.findUnique.mockResolvedValue({ ...registro, decisoes: [] });
      const response = await request(app.getHttpServer()).get('/api/matriculas/9007199254740995')
        .set('Authorization', auth([USER_ROLES.COORDENADOR]))
        .expect(200);
      expect(response.body.analisesSecretaria).toEqual([]);
    });
  });

  describe('POST /api/matriculas/:id/parecer-secretaria', () => {
    const url = '/api/matriculas/9007199254740995/parecer-secretaria';
    const corpo = { resultado: 'DOCUMENTACAO_OK', parecer: 'Documentos conferidos.' };
    const decididoEm = new Date('2026-02-04T09:00:00.000Z');

    beforeEach(() => {
      prisma.$queryRaw.mockResolvedValue([{ status: 'PENDENTE' }]);
      prisma.matriculaDecisao.create.mockImplementation(async ({ data }) => ({
        id: 9007199254740999n,
        etapa: data.etapa,
        resultado: data.resultado,
        parecer: data.parecer,
        decididoEm,
      }));
    });

    const enviar = (perfil: UserRole, body: unknown, rota = url) =>
      request(app.getHttpServer()).post(rota).set('Authorization', auth([perfil], '7')).send(body as object);

    it('exige autenticação e restringe a Administrador e Secretaria', async () => {
      await request(app.getHttpServer()).post(url).send(corpo).expect(401);
      await enviar(USER_ROLES.RESPONSAVEL, corpo).expect(403);
      await enviar(USER_ROLES.COORDENADOR, corpo).expect(403);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it.each([
      ['id não numérico', 'abc', corpo],
      ['id zero', '0', corpo],
      ['resultado inválido', '1', { ...corpo, resultado: 'APROVADA' }],
      ['resultado ausente', '1', { parecer: 'ok' }],
      ['parecer ausente em DOCUMENTACAO_OK', '1', { resultado: 'DOCUMENTACAO_OK' }],
      ['parecer vazio em PENDENCIA_DOCUMENTAL', '1', { resultado: 'PENDENCIA_DOCUMENTAL', parecer: '   ' }],
      ['parecer acima de 1000 caracteres', '1', { ...corpo, parecer: 'a'.repeat(1001) }],
      ['campo extra', '1', { ...corpo, status: 'APROVADA' }],
    ])('rejeita com 400: %s', async (_nome, id, body) => {
      await enviar(USER_ROLES.SECRETARIA, body, `/api/matriculas/${id}/parecer-secretaria`).expect(400);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('aceita parecer com exatamente 1000 caracteres', async () => {
      await enviar(USER_ROLES.SECRETARIA, { ...corpo, parecer: 'a'.repeat(1000) }).expect(201);
    });

    it('retorna 404 quando a matrícula não existe', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      await enviar(USER_ROLES.SECRETARIA, corpo).expect(404);
      expect(prisma.matriculaDecisao.create).not.toHaveBeenCalled();
    });

    it.each(['PENDENCIA_DOCUMENTAL', 'APROVADA', 'REJEITADA'])('retorna 409 para status %s', async (status) => {
      prisma.$queryRaw.mockResolvedValue([{ status }]);
      await enviar(USER_ROLES.SECRETARIA, corpo).expect(409);
      expect(prisma.matriculaDecisao.create).not.toHaveBeenCalled();
    });

    it.each<[UserRole, string, string]>([
      [USER_ROLES.ADMINISTRADOR, 'PENDENTE', 'DOCUMENTACAO_OK'],
      [USER_ROLES.SECRETARIA, 'PENDENTE', 'PENDENCIA_DOCUMENTAL'],
      [USER_ROLES.SECRETARIA, 'AGUARDANDO_COORDENADOR', 'DOCUMENTACAO_OK'],
      [USER_ROLES.ADMINISTRADOR, 'AGUARDANDO_COORDENADOR', 'PENDENCIA_DOCUMENTAL'],
    ])(
      'registra análise para %s, mantendo %s com resultado %s',
      async (perfil, status, resultado) => {
        prisma.$queryRaw.mockResolvedValue([{ status }]);
        const response = await enviar(perfil, { resultado, parecer: '  Documentos conferidos.  ' }).expect(201);

        expect(response.body).toEqual({
          protocolo: '9007199254740995',
          status,
          decisao: {
            id: '9007199254740999',
            etapa: 'SECRETARIA',
            resultado,
            parecer: 'Documentos conferidos.',
            decididoEm: '2026-02-04T09:00:00.000Z',
          },
        });
        expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
        expect(prisma.matricula.updateMany).not.toHaveBeenCalled();
        expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
        const [query, id] = prisma.$queryRaw.mock.calls[0];
        expect(query.join('?')).toMatch(/FOR UPDATE/i);
        expect(id).toBe(9007199254740995n);
        expect(prisma.matriculaDecisao.create).toHaveBeenCalledWith({
          data: {
            matriculaId: 9007199254740995n,
            usuarioId: 7n,
            etapa: 'SECRETARIA',
            resultado,
            parecer: 'Documentos conferidos.',
          },
          select: { id: true, etapa: true, resultado: true, parecer: true, decididoEm: true },
        });
      },
    );

    it('permite análises sucessivas sem alterar o status', async () => {
      const primeira = await enviar(USER_ROLES.SECRETARIA, {
        resultado: 'PENDENCIA_DOCUMENTAL',
        parecer: 'Falta comprovante de residência.',
      }).expect(201);
      const segunda = await enviar(USER_ROLES.SECRETARIA, corpo).expect(201);
      expect(primeira.body.status).toBe('PENDENTE');
      expect(segunda.body.status).toBe('PENDENTE');
      expect(prisma.matriculaDecisao.create).toHaveBeenCalledTimes(2);
      expect(prisma.matricula.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/matriculas/:id/decisao-coordenador', () => {
    const url = '/api/matriculas/9007199254740995/decisao-coordenador';
    const corpo = { resultado: 'APROVADA', parecer: 'Aprovada conforme análise.' };
    const decididoEm = new Date('2026-02-05T09:00:00.000Z');
    beforeEach(() => {
      prisma.matricula.updateMany.mockResolvedValue({ count: 1 });
      prisma.matriculaDecisao.create.mockImplementation(async ({ data }) => ({
        id: 9007199254740999n,
        etapa: data.etapa,
        resultado: data.resultado,
        parecer: data.parecer,
        decididoEm,
      }));
    });

    const enviar = (perfil: UserRole, body: unknown, rota = url) =>
      request(app.getHttpServer()).post(rota).set('Authorization', auth([perfil], '7')).send(body as object);

    it('exige autenticação e restringe a Administrador e Coordenador', async () => {
      await request(app.getHttpServer()).post(url).send(corpo).expect(401);
      await enviar(USER_ROLES.RESPONSAVEL, corpo).expect(403);
      await enviar(USER_ROLES.SECRETARIA, corpo).expect(403);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it.each([
      ['id não numérico', 'abc', corpo],
      ['id zero', '0', corpo],
      ['resultado inválido', '1', { ...corpo, resultado: 'DOCUMENTACAO_OK' }],
      ['resultado ausente', '1', { parecer: 'ok' }],
      ['parecer ausente', '1', { resultado: 'APROVADA' }],
      ['parecer só com espaços', '1', { resultado: 'REJEITADA', parecer: '   ' }],
      ['parecer acima de 1000 caracteres', '1', { ...corpo, parecer: 'a'.repeat(1001) }],
      ['campo extra', '1', { ...corpo, status: 'APROVADA' }],
    ])('rejeita com 400: %s', async (_nome, id, body) => {
      await enviar(USER_ROLES.COORDENADOR, body, `/api/matriculas/${id}/decisao-coordenador`).expect(400);
      expect(prisma.matricula.updateMany).not.toHaveBeenCalled();
    });

    it('aceita parecer com exatamente 1000 caracteres', async () => {
      await enviar(USER_ROLES.COORDENADOR, { ...corpo, parecer: 'a'.repeat(1000) }).expect(201);
    });

    it('retorna 404 quando a matrícula não existe', async () => {
      prisma.matricula.updateMany.mockResolvedValue({ count: 0 });
      prisma.matricula.findUnique.mockResolvedValue(null);
      await enviar(USER_ROLES.COORDENADOR, corpo).expect(404);
      expect(prisma.matriculaDecisao.create).not.toHaveBeenCalled();
    });

    it.each(['PENDENCIA_DOCUMENTAL', 'APROVADA', 'REJEITADA'])(
      'retorna 409 quando a matrícula está %s',
      async (status) => {
        prisma.matricula.updateMany.mockResolvedValue({ count: 0 });
        prisma.matricula.findUnique.mockResolvedValue({ status });
        await enviar(USER_ROLES.COORDENADOR, corpo).expect(409);
        expect(prisma.matriculaDecisao.create).not.toHaveBeenCalled();
      },
    );

    it.each([USER_ROLES.ADMINISTRADOR, USER_ROLES.COORDENADOR])(
      'APROVADA aprova, define dataAprovacao e registra a decisão (%s)',
      async (perfil) => {
        const response = await enviar(perfil, { ...corpo, parecer: '  Aprovada conforme análise.  ' }).expect(201);

        expect(response.body).toEqual({
          protocolo: '9007199254740995',
          status: 'APROVADA',
          emailEnviado: true,
          decisao: {
            id: '9007199254740999',
            etapa: 'COORDENADOR',
            resultado: 'APROVADA',
            parecer: 'Aprovada conforme análise.',
            decididoEm: '2026-02-05T09:00:00.000Z',
          },
        });
        expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
        expect(prisma.matricula.updateMany).toHaveBeenCalledWith({
          where: { id: 9007199254740995n, status: { in: ['PENDENTE', 'AGUARDANDO_COORDENADOR'] } },
          data: { status: 'APROVADA', dataAprovacao: expect.any(Date) },
        });
        expect(prisma.matriculaDecisao.create).toHaveBeenCalledWith({
          data: {
            matriculaId: 9007199254740995n,
            usuarioId: 7n,
            etapa: 'COORDENADOR',
            resultado: 'APROVADA',
            parecer: 'Aprovada conforme análise.',
          },
          select: { id: true, etapa: true, resultado: true, parecer: true, decididoEm: true },
        });
      },
    );

    it.each(['PENDENTE', 'AGUARDANDO_COORDENADOR'])(
      'aprova matrícula no status %s e impede decisão repetida',
      async (statusInicial) => {
        let status = statusInicial;
        prisma.matricula.updateMany.mockImplementation(async ({ where, data }) => {
          if (!where.status.in.includes(status)) return { count: 0 };
          status = data.status;
          return { count: 1 };
        });
        prisma.matricula.findUnique.mockImplementation(async () => ({ status }));

        await enviar(USER_ROLES.COORDENADOR, corpo).expect(201);
        await enviar(USER_ROLES.COORDENADOR, corpo).expect(409);
        expect(prisma.matriculaDecisao.create).toHaveBeenCalledTimes(1);
      },
    );

    it('REJEITADA rejeita, zera dataAprovacao e persiste o parecer', async () => {
      const response = await enviar(USER_ROLES.COORDENADOR, {
        resultado: 'REJEITADA',
        parecer: 'Idade incompatível com a etapa.',
      }).expect(201);

      expect(response.body.status).toBe('REJEITADA');
      expect(response.body.decisao).toMatchObject({
        etapa: 'COORDENADOR',
        resultado: 'REJEITADA',
        parecer: 'Idade incompatível com a etapa.',
      });
      expect(prisma.matricula.updateMany).toHaveBeenCalledWith({
        where: { id: 9007199254740995n, status: { in: ['PENDENTE', 'AGUARDANDO_COORDENADOR'] } },
        data: { status: 'REJEITADA', dataAprovacao: null },
      });
      expect(prisma.usuario.findMany).not.toHaveBeenCalled();
      expect(mailer.sendMail).not.toHaveBeenCalled();
    });

    it('vincula outro filho ao responsável existente e envia somente orientação de login', async () => {
      await enviar(USER_ROLES.COORDENADOR, corpo).expect(201);
      expect(prisma.usuario.create).not.toHaveBeenCalled();
      expect(prisma.matricula.update).toHaveBeenCalledWith({
        where: { id: 9007199254740995n }, data: { responsavelId: 9n },
      });
      expect(prisma.catequizando.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ responsavelId: 9n, matriculaId: 9007199254740995n, nome: 'Ana Silva' }),
      }));
      expect(authService.sendPasswordSetupInvite).not.toHaveBeenCalled();
      expect(mailer.sendMail).toHaveBeenCalledWith(expect.objectContaining({
        to: ['maria@example.com'], text: expect.stringMatching(/coordenação aprovou[\s\S]*\/login/),
      }), { requireDelivery: true });
    });

    it('cria conta e envia convite de primeiro acesso para um novo responsável', async () => {
      prisma.usuario.findMany.mockResolvedValue([]);
      prisma.perfil.findUnique.mockResolvedValue({ id: 2n });
      prisma.usuario.create.mockResolvedValue({ responsavel: { id: 10n } });
      prisma.matricula.findUniqueOrThrow.mockResolvedValue({
        responsavelEmail: 'Maria@Example.com', responsavelNome: 'Maria', responsavelCpf: '12345678900',
        responsavelTelefone: '11999999999', responsavelParentesco: 'Mãe', catequizandoNome: 'Ana Silva',
        catequizandoDataNascimento: new Date('2015-03-20'), catequizandoEndereco: 'Rua Exemplo',
        catequizandoTelefoneEmergencia: '11999999999',
      });
      prisma.matricula.findUnique.mockResolvedValue({
        status: 'APROVADA', responsavel: { usuario: { id: 11n, ativo: true, primeiroAcesso: true } },
      });
      authService.sendPasswordSetupInvite.mockResolvedValue({ emailSent: true });
      await enviar(USER_ROLES.COORDENADOR, corpo).expect(201);
      expect(prisma.usuario.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ email: 'Maria@Example.com', primeiroAcesso: true }),
      }));
      expect(authService.sendPasswordSetupInvite).toHaveBeenCalledWith(11n, true);
      expect(mailer.sendMail).not.toHaveBeenCalled();
    });

    it('recusa vínculo quando o CPF não corresponde à conta existente', async () => {
      prisma.usuario.findMany.mockResolvedValue([{
        ativo: true, responsavel: { id: 9n, cpf: '99999999999' },
        perfis: [{ perfil: { nome: 'RESPONSAVEL' } }],
      }]);
      await enviar(USER_ROLES.COORDENADOR, corpo).expect(409);
      expect(prisma.catequizando.create).not.toHaveBeenCalled();
      expect(mailer.sendMail).not.toHaveBeenCalled();
    });

    it('informa falha de e-mail sem desfazer a aprovação', async () => {
      mailer.sendMail.mockRejectedValue(new Error('SMTP indisponível'));
      const response = await enviar(USER_ROLES.COORDENADOR, corpo).expect(201);
      expect(response.body).toMatchObject({ status: 'APROVADA', emailEnviado: false });
    });

    it('permite apenas à coordenação ou administração reenviar a aprovação', async () => {
      const rota = '/api/matriculas/9007199254740995/notificacao-aprovacao';
      await request(app.getHttpServer()).post(rota).set('Authorization', auth([USER_ROLES.RESPONSAVEL])).expect(403);
      const response = await request(app.getHttpServer()).post(rota)
        .set('Authorization', auth([USER_ROLES.COORDENADOR])).expect(201);
      expect(response.body).toEqual({ emailEnviado: true });
    });

  });

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
