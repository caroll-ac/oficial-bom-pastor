import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { TipoPasswordSetup } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { MailerService } from '../../common/mailer/mailer.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

describe('AuthService', () => {
  const prisma = {
    usuario: { findUnique: jest.fn(), update: jest.fn() },
    passwordSetupToken: { findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn(), delete: jest.fn() },
    $transaction: jest.fn(),
  };
  const mailer = { sendMail: jest.fn() };
  let service: AuthService;
  let jwt: JwtService;
  let senha: string;

  const makeUser = (perfis = ['RESPONSAVEL']) => ({
    id: 9007199254740993n,
    nome: 'Maria',
    email: 'maria@example.com',
    senha,
    telefone: null,
    ativo: true,
    primeiroAcesso: false,
    dataCadastro: new Date(),
    perfis: perfis.map((nome) => ({ perfil: { nome } })),
  });

  beforeAll(async () => {
    senha = await bcrypt.hash('SenhaForte123!', 4);
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailerService, useValue: mailer },
        {
          provide: ConfigService,
          useValue: {
            get: (name: string) => ({
              JWT_SECRET: 'access-secret',
              JWT_REFRESH_SECRET: 'refresh-secret',
              FRONTEND_URL: 'http://localhost:5173',
            })[name],
          },
        },
      ],
    }).compile();
    service = module.get(AuthService);
    jwt = module.get(JwtService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
    prisma.usuario.update.mockResolvedValue({});
    prisma.passwordSetupToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.passwordSetupToken.delete.mockResolvedValue({});
  });

  it('autentica com BigInt e inclui todos os perfis no JWT', async () => {
    prisma.usuario.findUnique.mockResolvedValue(makeUser(['RESPONSAVEL', 'CATEQUISTA']));
    const result = await service.login({ email: 'maria@example.com', senha: 'SenhaForte123!' });
    const payload = jwt.verify(result.accessToken, { secret: 'access-secret' });
    expect(result.user.id).toBe('9007199254740993');
    expect(result.user.role).toBeUndefined();
    expect(payload).toMatchObject({
      sub: '9007199254740993', email: 'maria@example.com', perfis: ['RESPONSAVEL', 'CATEQUISTA'], tokenUse: 'access',
    });
  });

  it('rejeita senha incorreta, usuário inativo, primeiro acesso e perfis inválidos', async () => {
    prisma.usuario.findUnique.mockResolvedValue(makeUser());
    await expect(service.login({ email: 'maria@example.com', senha: 'errada' })).rejects.toBeInstanceOf(UnauthorizedException);
    prisma.usuario.findUnique.mockResolvedValue({ ...makeUser(), ativo: false });
    await expect(service.login({ email: 'maria@example.com', senha: 'SenhaForte123!' })).rejects.toBeInstanceOf(UnauthorizedException);
    prisma.usuario.findUnique.mockResolvedValue({ ...makeUser(), primeiroAcesso: true });
    await expect(service.login({ email: 'maria@example.com', senha: 'SenhaForte123!' })).rejects.toBeInstanceOf(UnauthorizedException);
    prisma.usuario.findUnique.mockResolvedValue(makeUser(['DESCONHECIDO']));
    await expect(service.login({ email: 'maria@example.com', senha: 'SenhaForte123!' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('renova apenas refresh tokens e consulta os perfis atuais', async () => {
    prisma.usuario.findUnique.mockResolvedValueOnce(makeUser()).mockResolvedValueOnce(makeUser(['SECRETARIA']));
    const login = await service.login({ email: 'maria@example.com', senha: 'SenhaForte123!' });
    const renewed = await service.refreshToken(login.refreshToken);
    expect(jwt.verify(renewed.accessToken, { secret: 'access-secret' }).perfis).toEqual(['SECRETARIA']);
    await expect(service.refreshToken(login.accessToken)).rejects.toBeInstanceOf(UnauthorizedException);
    prisma.usuario.findUnique.mockResolvedValueOnce({ ...makeUser(), ativo: false });
    await expect(service.refreshToken(login.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each([TipoPasswordSetup.PRIMEIRO_ACESSO, TipoPasswordSetup.RESET_SENHA])(
    'consome atomicamente o token %s e atualiza o usuário',
    async (tipo) => {
      const usuario = { ...makeUser(), primeiroAcesso: tipo === TipoPasswordSetup.PRIMEIRO_ACESSO };
      prisma.passwordSetupToken.findUnique.mockResolvedValue({
        id: 10n, usuarioId: usuario.id, tipo, usuario, usadoEm: null, expiraEm: new Date(Date.now() + 60000),
      });
      await service.completePasswordSetup('token-raw', 'NovaSenha123!', 'NovaSenha123!');
      expect(prisma.passwordSetupToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: createHash('sha256').update('token-raw').digest('hex') },
        include: { usuario: true },
      });
      expect(prisma.usuario.update).toHaveBeenCalledWith({
        where: { id: usuario.id },
        data: { senha: expect.any(String), primeiroAcesso: false },
      });
      expect(prisma.passwordSetupToken.updateMany).toHaveBeenCalledTimes(2);
    },
  );

  it('rejeita token usado, expirado, sem tipo ou de finalidade incorreta', async () => {
    const valid = {
      id: 10n, usuarioId: 1n, tipo: TipoPasswordSetup.PRIMEIRO_ACESSO,
      usuario: { ...makeUser(), primeiroAcesso: true }, usadoEm: null, expiraEm: new Date(Date.now() + 60000),
    };
    for (const token of [
      { ...valid, usadoEm: new Date() },
      { ...valid, expiraEm: new Date(0) },
      { ...valid, tipo: null },
      { ...valid, usuario: { ...valid.usuario, ativo: false } },
      { ...valid, usuario: { ...valid.usuario, primeiroAcesso: false } },
    ]) {
      prisma.passwordSetupToken.findUnique.mockResolvedValueOnce(token);
      await expect(service.validatePasswordSetupToken('token')).rejects.toBeInstanceOf(BadRequestException);
    }
    prisma.passwordSetupToken.findUnique.mockResolvedValueOnce(valid);
    await expect(service.resetPassword('token', 'NovaSenha123!')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('não atualiza senha se outro pedido consumiu o token', async () => {
    prisma.passwordSetupToken.findUnique.mockResolvedValue({
      id: 1n, usuarioId: 1n, tipo: TipoPasswordSetup.RESET_SENHA,
      usuario: makeUser(), usadoEm: null, expiraEm: new Date(Date.now() + 60000),
    });
    prisma.passwordSetupToken.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.resetPassword('token', 'NovaSenha123!')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('emite convite e recuperação com tipo, hash e link apropriados', async () => {
    const usuario = { ...makeUser(), primeiroAcesso: true };
    prisma.usuario.findUnique.mockResolvedValue(usuario);
    prisma.passwordSetupToken.create.mockResolvedValue({ id: 1n });
    mailer.sendMail.mockResolvedValue({});
    await service.sendPasswordSetupInvite(usuario.id);
    expect(prisma.passwordSetupToken.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ usuarioId: usuario.id, tipo: TipoPasswordSetup.PRIMEIRO_ACESSO, tokenHash: expect.any(String) }),
    });
    await service.forgotPassword(usuario.email);
    expect(prisma.passwordSetupToken.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ usuarioId: usuario.id, tipo: TipoPasswordSetup.RESET_SENHA }),
    });
    expect(mailer.sendMail.mock.calls[1][0].text).toContain('/criar-senha?token=');
  });

  it('informa a aprovação no convite de primeiro acesso', async () => {
    const usuario = { ...makeUser(), primeiroAcesso: true };
    prisma.usuario.findUnique.mockResolvedValue(usuario);
    prisma.passwordSetupToken.create.mockResolvedValue({ id: 1n });
    mailer.sendMail.mockResolvedValue({});
    await service.sendPasswordSetupInvite(usuario.id, true);
    expect(mailer.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      subject: expect.stringContaining('Matrícula aprovada'),
      text: expect.stringContaining('A coordenação aprovou a matrícula.'),
    }), { requireDelivery: true });
  });

  it('rejeita explicitamente atualização de foto', async () => {
    await expect(service.updateMyProfile('1', { removerFoto: true })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('JwtStrategy', () => {
  const strategy = new JwtStrategy(new ConfigService({ JWT_SECRET: 'access-secret' }));

  it('retorna perfis válidos sem escolher um único para múltiplos perfis', async () => {
    await expect(strategy.validate({
      sub: '1', email: 'maria@example.com', perfis: ['SECRETARIA', 'COORDENADOR'], tokenUse: 'access',
    })).resolves.toMatchObject({ perfis: ['SECRETARIA', 'COORDENADOR'], role: undefined });
  });

  it('rejeita refresh token e papéis desconhecidos', async () => {
    await expect(strategy.validate({
      sub: '1', email: 'maria@example.com', perfis: ['RESPONSAVEL'], tokenUse: 'refresh',
    })).rejects.toBeInstanceOf(UnauthorizedException);
    const invalidPayload = JSON.parse('{"sub":"1","email":"maria@example.com","perfis":["DESCONHECIDO"],"tokenUse":"access"}');
    await expect(strategy.validate(invalidPayload)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
