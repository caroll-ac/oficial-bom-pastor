import { BadRequestException, ConflictException, ForbiddenException, INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { S3StorageService } from '../../common/storage/s3-storage.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { RenovacoesController } from './renovacoes.controller';
import { RenovacoesService, RenewalFiles } from './renovacoes.service';

describe('Rematrícula', () => {
  let service: RenovacoesService;
  const prisma = {
    catequizando: { findMany: jest.fn() },
    responsavel: { findUnique: jest.fn() },
    renovacao: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
    renovacaoConfiguracao: { findUnique: jest.fn(), upsert: jest.fn() },
    renovacaoDocumento: { deleteMany: jest.fn(), createMany: jest.fn(), findMany: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  const storage = { uploadBufferDocument: jest.fn(), deleteObject: jest.fn(), getPrivateFileUrl: jest.fn() };
  const file = { buffer: Buffer.from('documento'), mimetype: 'application/pdf' };
  const files: RenewalFiles = {
    comprovantePix: [file], certificadoBatismo: [file], comprovanteEndereco: [file], certidaoNascimento: [file],
  };
  const year = new Date().getFullYear();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RenovacoesService,
        { provide: PrismaService, useValue: prisma },
        { provide: S3StorageService, useValue: storage },
      ],
    }).compile();
    service = module.get(RenovacoesService);
  });

  describe('Permissões de rematrícula', () => {
    let app: INestApplication;
    const service = {
      mine: jest.fn(), list: jest.fn(), periodo: jest.fn(),
      definirPeriodo: jest.fn(), fecharPeriodo: jest.fn(),
    };
    const jwt = new JwtService();
    const token = (perfil: string) => `Bearer ${jwt.sign(
      { sub: '1', email: 'teste@example.invalid', perfis: [perfil], tokenUse: 'access' },
      { secret: 'test-secret' },
    )}`;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        controllers: [RenovacoesController],
        providers: [
          { provide: RenovacoesService, useValue: service },
          { provide: ConfigService, useValue: { get: () => 'test-secret' } },
          JwtStrategy,
          { provide: APP_GUARD, useClass: JwtAuthGuard },
          { provide: APP_GUARD, useClass: RolesGuard },
        ],
      }).compile();
      app = module.createNestApplication();
      app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
      await app.init();
    });

    afterAll(async () => { await app.close(); });

    beforeEach(() => {
      service.mine.mockResolvedValue({ catequizandos: [], renovacoes: [] });
      service.list.mockResolvedValue([]);
      service.periodo.mockResolvedValue({ dataLiberacao: null, aberta: false });
      service.definirPeriodo.mockResolvedValue({ dataLiberacao: '2027-01-01', aberta: false });
      service.fecharPeriodo.mockResolvedValue({ dataLiberacao: null, aberta: false });
    });

    it('reserva os próprios filhos ao responsável autenticado', async () => {
      await request(app.getHttpServer()).get('/renovacoes/me').expect(401);
      await request(app.getHttpServer()).get('/renovacoes/me').set('Authorization', token('COORDENADOR')).expect(403);
      await request(app.getHttpServer()).get('/renovacoes/me').set('Authorization', token('RESPONSAVEL')).expect(200);
      expect(service.mine).toHaveBeenCalledTimes(1);
      expect(service.mine).toHaveBeenCalledWith('1');
    });

    it('reserva a lista de análise à coordenação ou administração', async () => {
      await request(app.getHttpServer()).get('/renovacoes').set('Authorization', token('RESPONSAVEL')).expect(403);
      await request(app.getHttpServer()).get('/renovacoes').set('Authorization', token('COORDENADOR')).expect(200);
    });

    it('permite consulta à secretaria, mas apenas o administrador altera ou fecha a liberação', async () => {
      await request(app.getHttpServer()).get('/renovacoes/periodo').expect(401);
      await request(app.getHttpServer()).get('/renovacoes/periodo').set('Authorization', token('SECRETARIA')).expect(200);
      await request(app.getHttpServer()).get('/renovacoes/periodo').set('Authorization', token('RESPONSAVEL')).expect(200);
      await request(app.getHttpServer()).put('/renovacoes/periodo').set('Authorization', token('SECRETARIA'))
        .send({ dataLiberacao: '2027-01-01' }).expect(403);
      await request(app.getHttpServer()).delete('/renovacoes/periodo').set('Authorization', token('SECRETARIA')).expect(403);
      await request(app.getHttpServer()).put('/renovacoes/periodo').set('Authorization', token('ADMINISTRADOR'))
        .send({ dataLiberacao: '2027-02-30' }).expect(400);
      await request(app.getHttpServer()).put('/renovacoes/periodo').set('Authorization', token('ADMINISTRADOR'))
        .send({ dataLiberacao: '2027-01-01' }).expect(200);
      await request(app.getHttpServer()).delete('/renovacoes/periodo').set('Authorization', token('ADMINISTRADOR')).expect(200);
      expect(service.definirPeriodo).toHaveBeenCalledTimes(1);
      expect(service.fecharPeriodo).toHaveBeenCalledTimes(1);
    });
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.catequizando.findMany.mockResolvedValue([{ id: 2n, nome: 'Ana', turma: null, renovacoes: [] }]);
    prisma.responsavel.findUnique.mockResolvedValue({ id: 3n });
    prisma.renovacao.findUnique.mockResolvedValue(null);
    prisma.renovacao.findMany.mockResolvedValue([]);
    prisma.renovacaoConfiguracao.findUnique.mockResolvedValue({ id: 1, dataLiberacao: new Date('2000-01-01T00:00:00Z') });
    prisma.$queryRaw.mockResolvedValue([{ dataLiberacao: new Date('2000-01-01T00:00:00Z') }]);
    prisma.renovacao.create.mockResolvedValue({ id: 4n, status: 'PENDING' });
    prisma.$transaction.mockImplementation((fn) => fn(prisma));
    storage.uploadBufferDocument.mockImplementation(async (_buffer, _mime, _folder, label) => ({ key: `key-${label}` }));
    storage.deleteObject.mockResolvedValue(undefined);
  });

  it('mantém fechada sem configuração e libera na data em horário de Brasília', async () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date('2027-01-02T02:59:59Z'));
      prisma.renovacaoConfiguracao.findUnique.mockResolvedValue(null);
      await expect(service.periodo()).resolves.toEqual({ dataLiberacao: null, aberta: false });
      prisma.renovacaoConfiguracao.findUnique.mockResolvedValue({ dataLiberacao: new Date('2027-01-02T00:00:00Z') });
      await expect(service.periodo()).resolves.toEqual({ dataLiberacao: '2027-01-02', aberta: false });
      jest.setSystemTime(new Date('2027-01-02T03:00:00Z'));
      await expect(service.periodo()).resolves.toEqual({ dataLiberacao: '2027-01-02', aberta: true });
    } finally {
      jest.useRealTimers();
    }
  });

  it('não permite envio antes da data ou sem configuração', async () => {
    prisma.renovacaoConfiguracao.findUnique.mockResolvedValue(null);
    await expect(service.create('7', '2', year, files)).rejects.toBeInstanceOf(ForbiddenException);
    prisma.renovacaoConfiguracao.findUnique.mockResolvedValue({ dataLiberacao: new Date('2999-01-01T00:00:00Z') });
    await expect(service.create('7', '2', year, files)).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.uploadBufferDocument).not.toHaveBeenCalled();
    expect(prisma.renovacao.create).not.toHaveBeenCalled();
  });

  it('verifica a liberação novamente antes de gravar e limpa arquivos se for fechada durante o envio', async () => {
    prisma.$queryRaw.mockResolvedValue([{ dataLiberacao: null }]);
    await expect(service.create('7', '2', year, files)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.renovacao.create).not.toHaveBeenCalled();
    expect(storage.deleteObject).toHaveBeenCalledTimes(4);
  });

  it('salva e limpa a data configurada', async () => {
    prisma.renovacaoConfiguracao.upsert.mockResolvedValue({ id: 1, dataLiberacao: new Date('2027-01-01T00:00:00Z') });
    await expect(service.definirPeriodo('2027-01-01')).resolves.toMatchObject({ dataLiberacao: '2027-01-01' });
    await expect(service.definirPeriodo('2027-02-30')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.fecharPeriodo()).resolves.toEqual({ dataLiberacao: null, aberta: false });
    expect(prisma.renovacaoConfiguracao.upsert).toHaveBeenLastCalledWith({
      where: { id: 1 }, create: { id: 1, dataLiberacao: null }, update: { dataLiberacao: null },
    });
  });

  it('lista apenas filhos do usuário autenticado e serializa os IDs', async () => {
    prisma.renovacao.findMany.mockResolvedValue([{ id: 4n, catequizandoId: 2n, ano: year, status: 'PENDING' }]);
    const result = await service.mine('7');
    expect(prisma.catequizando.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { responsavel: { usuarioId: 7n } },
    }));
    expect(result.catequizandos[0]).toMatchObject({
      id: '2', documentosFaltantes: ['certificadoBatismo', 'comprovanteEndereco', 'certidaoNascimento'],
    });
    expect(result.renovacoes[0]).toMatchObject({ id: '4', catequizandoId: '2' });
  });

  it('não permite rematrícula de filho de outro responsável', async () => {
    await expect(service.create('7', '999', year, files)).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.uploadBufferDocument).not.toHaveBeenCalled();
  });

  it('exige o Pix e os documentos que ainda não foram enviados', async () => {
    await expect(service.create('7', '2', year, { comprovantePix: [file] })).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.uploadBufferDocument).not.toHaveBeenCalled();
  });

  it('não exige novamente documentos de uma rematrícula aprovada', async () => {
    prisma.catequizando.findMany.mockResolvedValue([{
      id: 2n, nome: 'Ana', turma: null,
      renovacoes: [{ documentos: [
        { tipo: 'CERTIFICADO_BATISMO' }, { tipo: 'COMPROVANTE_ENDERECO' }, { tipo: 'CERTIDAO_NASCIMENTO' },
      ] }],
    }]);
    await expect(service.create('7', '2', year, { comprovantePix: [file] }))
      .resolves.toEqual({ id: '4', status: 'PENDING' });
    expect(storage.uploadBufferDocument).toHaveBeenCalledTimes(1);
  });

  it('registra uma solicitação pendente com os documentos e o Pix', async () => {
    await expect(service.create('7', '2', year, files)).resolves.toEqual({ id: '4', status: 'PENDING' });
    expect(prisma.renovacao.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        catequizandoId: 2n, responsavelId: 3n, ano: year, comprovanteKey: 'key-comprovantePix',
        documentos: { create: expect.arrayContaining([expect.objectContaining({ tipo: 'CERTIDAO_NASCIMENTO' })]) },
      }),
    }));
  });

  it('disponibiliza à coordenação links temporários para os arquivos', async () => {
    prisma.renovacao.findMany.mockResolvedValue([{
      id: 4n, catequizandoId: 2n, ano: year, status: 'PENDING', observacoes: null,
      comprovanteKey: 'pix-privado', catequizando: { nome: 'Ana' },
      responsavel: { usuario: { nome: 'Maria', email: 'maria@example.invalid', telefone: null } },
      documentos: [{ tipo: 'CERTIDAO_NASCIMENTO', fileKey: 'certidao-privada' }],
    }]);
    prisma.renovacaoDocumento.findMany.mockResolvedValue([]);
    storage.getPrivateFileUrl.mockImplementation(async (key) => `signed:${key}`);
    const [record] = await service.list();
    expect(record.comprovanteUrl).toBe('signed:pix-privado');
    expect(record.documentos).toContainEqual({ tipo: 'CERTIDAO_NASCIMENTO', url: 'signed:certidao-privada' });
    expect(storage.getPrivateFileUrl).toHaveBeenCalledWith('certidao-privada');
  });

  it('limpa os arquivos novos se o registro falhar', async () => {
    prisma.$transaction.mockRejectedValue(new Error('banco indisponível'));
    await expect(service.create('7', '2', year, files)).rejects.toThrow('banco indisponível');
    expect(storage.deleteObject).toHaveBeenCalledTimes(4);
  });

  it('permite reenviar solicitação recusada e descarta arquivos antigos após salvar', async () => {
    prisma.renovacao.findUnique.mockResolvedValue({
      id: 4n, status: 'REJECTED', comprovanteKey: 'pix-antigo', documentos: [{ fileKey: 'doc-antigo' }],
    });
    prisma.renovacao.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.create('7', '2', year, files)).resolves.toEqual({ id: '4', status: 'PENDING' });
    expect(prisma.renovacao.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 4n, status: 'REJECTED' },
    }));
    expect(storage.deleteObject).toHaveBeenCalledWith('pix-antigo');
    expect(storage.deleteObject).toHaveBeenCalledWith('doc-antigo');
  });

  it('não aceita segunda solicitação pendente e exige motivo de recusa', async () => {
    prisma.renovacao.findUnique.mockResolvedValue({ id: 4n, status: 'PENDING' });
    await expect(service.create('7', '2', year, files)).rejects.toBeInstanceOf(ConflictException);
    await expect(service.decide('4', 'REJECTED', ' ')).rejects.toBeInstanceOf(BadRequestException);
  });
});
