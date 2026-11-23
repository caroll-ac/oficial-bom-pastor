import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, TipoPasswordSetup } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { isUserRole, UserRole } from '../../common/constants/user-roles';
import { MailerService } from '../../common/mailer/mailer.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto, UpdateMyProfileDto } from './dto/auth.dto';
import { AuthTokenPayload } from './strategies/jwt.strategy';

const usuarioComPerfis = {
  perfis: { include: { perfil: true } },
} satisfies Prisma.UsuarioInclude;

type UsuarioComPerfis = Prisma.UsuarioGetPayload<{ include: typeof usuarioComPerfis }>;
type ProfilePhotoFile = { buffer: Buffer; mimetype?: string };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
      include: usuarioComPerfis,
    });

    if (!usuario || usuario.ativo !== true || !(await bcrypt.compare(dto.senha, usuario.senha))) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }
    if (usuario.primeiroAcesso) {
      throw new UnauthorizedException('Use o link enviado por e-mail para criar sua senha antes de entrar.');
    }

    const perfis = this.getPerfis(usuario);
    return {
      user: this.serializeUser(usuario, perfis),
      ...this.generateTokens(usuario.id.toString(), usuario.email, perfis),
    };
  }

  async refreshToken(refreshToken: string) {
    let payload: AuthTokenPayload;
    try {
      payload = this.jwtService.verify<AuthTokenPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (!payload || payload.tokenUse !== 'refresh' || typeof payload.sub !== 'string' || !/^[1-9]\d*$/.test(payload.sub)) {
      throw new UnauthorizedException('Refresh token inválido');
    }
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: BigInt(payload.sub) },
      include: usuarioComPerfis,
    });
    if (!usuario || usuario.ativo !== true || usuario.primeiroAcesso) {
      throw new UnauthorizedException('Refresh token inválido');
    }
    return this.generateTokens(usuario.id.toString(), usuario.email, this.getPerfis(usuario));
  }

  async getMe(userId: string) {
    const usuario = await this.findActiveUser(userId);
    return {
      ...this.serializeUser(usuario, this.getPerfis(usuario)),
      telefone: usuario.telefone,
      criadoEm: usuario.dataCadastro,
      fotoUrl: null,
    };
  }

  async updateMyProfile(userId: string, dto: UpdateMyProfileDto, foto?: ProfilePhotoFile) {
    if (foto || dto.removerFoto) {
      throw new BadRequestException('Foto de perfil não está disponível no modelo de dados atual.');
    }
    const usuario = await this.findActiveUser(userId);
    const passwordFieldsProvided = Boolean(dto.senhaAtual || dto.novaSenha || dto.confirmacaoNovaSenha);
    let senha: string | undefined;

    if (passwordFieldsProvided) {
      if (!dto.senhaAtual || !dto.novaSenha || !dto.confirmacaoNovaSenha) {
        throw new BadRequestException('Preencha a senha atual, a nova senha e a confirmação.');
      }
      if (dto.novaSenha !== dto.confirmacaoNovaSenha) {
        throw new BadRequestException('A nova senha e a confirmação não coincidem.');
      }
      this.assertStrongPassword(dto.novaSenha);
      if (!(await bcrypt.compare(dto.senhaAtual, usuario.senha))) {
        throw new BadRequestException('A senha atual está incorreta.');
      }
      senha = await bcrypt.hash(dto.novaSenha, 12);
    }

    const nome = dto.nome?.trim();
    if (dto.nome !== undefined && (!nome || nome.length < 2)) {
      throw new BadRequestException('O nome deve ter pelo menos dois caracteres.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: usuario.id },
        data: {
          ...(nome !== undefined && { nome }),
          ...(dto.telefone !== undefined && { telefone: dto.telefone.trim() || null }),
          ...(senha !== undefined && { senha }),
        },
      });
      if (senha !== undefined) {
        await tx.passwordSetupToken.updateMany({
          where: { usuarioId: usuario.id, usadoEm: null },
          data: { usadoEm: new Date() },
        });
      }
    });
    return this.getMe(userId);
  }

  async sendPasswordSetupInvite(usuarioId: bigint, matriculaAprovada = false) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario || usuario.ativo !== true || !usuario.primeiroAcesso) {
      throw new BadRequestException('Usuário indisponível para primeiro acesso.');
    }
    return this.sendPasswordSetupEmail(usuario, TipoPasswordSetup.PRIMEIRO_ACESSO, true, matriculaAprovada);
  }

  async validatePasswordSetupToken(token: string) {
    const setupToken = await this.findActivePasswordSetupToken(token);
    return {
      email: setupToken.usuario.email,
      nome: setupToken.usuario.nome,
      expiresAt: setupToken.expiraEm,
    };
  }

  async completePasswordSetup(token: string, senha: string, confirmacao: string) {
    return this.applyPasswordSetup(token, senha, confirmacao);
  }

  async forgotPassword(email: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    if (usuario?.ativo === true) {
      try {
        await this.sendPasswordSetupEmail(usuario, TipoPasswordSetup.RESET_SENHA, false);
      } catch (error) {
        this.logger.error('Falha ao enviar e-mail de recuperação de senha.', error instanceof Error ? error.stack : String(error));
      }
    }
    return { message: 'Se o e-mail estiver cadastrado, enviaremos instruções para redefinir a senha.' };
  }

  async resetPassword(token: string, novaSenha: string) {
    return this.applyPasswordSetup(token, novaSenha, novaSenha, TipoPasswordSetup.RESET_SENHA);
  }

  private async applyPasswordSetup(token: string, senha: string, confirmacao: string, tipoEsperado?: TipoPasswordSetup) {
    if (senha !== confirmacao) {
      throw new BadRequestException('As senhas não coincidem.');
    }
    this.assertStrongPassword(senha);
    const setupToken = await this.findActivePasswordSetupToken(token, tipoEsperado);
    const hashedPassword = await bcrypt.hash(senha, 12);
    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const consumed = await tx.passwordSetupToken.updateMany({
        where: {
          id: setupToken.id,
          usuarioId: setupToken.usuarioId,
          tipo: setupToken.tipo,
          usadoEm: null,
          expiraEm: { gt: now },
          usuario: {
            ativo: true,
            ...(setupToken.tipo === TipoPasswordSetup.PRIMEIRO_ACESSO && { primeiroAcesso: true }),
          },
        },
        data: { usadoEm: now },
      });
      if (consumed.count !== 1) {
        throw new BadRequestException('Este convite já foi usado ou expirou.');
      }
      await tx.usuario.update({
        where: { id: setupToken.usuarioId },
        data: { senha: hashedPassword, primeiroAcesso: false },
      });
      await tx.passwordSetupToken.updateMany({
        where: { usuarioId: setupToken.usuarioId, usadoEm: null },
        data: { usadoEm: now },
      });
    });
    return { message: 'Senha criada com sucesso.' };
  }

  private async findActivePasswordSetupToken(token: string, tipoEsperado?: TipoPasswordSetup) {
    if (!token) {
      throw new BadRequestException('O link está incompleto.');
    }
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const setupToken = await this.prisma.passwordSetupToken.findUnique({
      where: { tokenHash },
      include: { usuario: true },
    });
    if (
      !setupToken || setupToken.usadoEm || setupToken.expiraEm <= new Date() ||
      setupToken.usuario.ativo !== true ||
      (setupToken.tipo === TipoPasswordSetup.PRIMEIRO_ACESSO && !setupToken.usuario.primeiroAcesso) ||
      (setupToken.tipo !== TipoPasswordSetup.PRIMEIRO_ACESSO && setupToken.tipo !== TipoPasswordSetup.RESET_SENHA) ||
      (tipoEsperado && setupToken.tipo !== tipoEsperado)
    ) {
      throw new BadRequestException('Este convite é inválido ou expirou. Solicite um novo e-mail.');
    }
    return setupToken;
  }

  private async sendPasswordSetupEmail(
    usuario: { id: bigint; email: string; nome: string },
    tipo: TipoPasswordSetup,
    requireDelivery: boolean,
    matriculaAprovada = false,
  ) {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const setupToken = await this.prisma.passwordSetupToken.create({
      data: { usuarioId: usuario.id, tokenHash, expiraEm, tipo },
    });
    try {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') ??
        this.configService.get<string>('FRONTEND_URLS')?.split(',')[0]?.trim() ??
        'http://localhost:8080';
      const setupUrl = new URL('/criar-senha', frontendUrl);
      setupUrl.searchParams.set('token', rawToken);
      const isReset = tipo === TipoPasswordSetup.RESET_SENHA;
      const action = isReset ? 'redefinir sua senha' : 'criar sua senha de acesso';
      const approval = matriculaAprovada ? 'A coordenação aprovou a matrícula. ' : '';
      const text = `Olá, ${usuario.nome}.\n\n${approval}Use o link abaixo para ${action}:\n${setupUrl}\n\nO link expira em 24 horas e só pode ser usado uma vez. Se você não solicitou esta ação, ignore esta mensagem.`;
      const delivery = await this.mailerService.sendMail({
        to: [usuario.email],
        subject: isReset ? 'Redefina sua senha | Catequese Bom Pastor' : matriculaAprovada ? 'Matrícula aprovada | Catequese Bom Pastor' : 'Crie sua senha de acesso | Catequese Bom Pastor',
        text,
        html: `<p>Olá, ${this.escapeHtml(usuario.nome)}.</p><p>${approval}Use o link abaixo para ${action}:</p><p><a href="${this.escapeHtml(setupUrl.toString())}">Definir senha</a></p><p>O link expira em 24 horas e só pode ser usado uma vez.</p>`,
      }, { requireDelivery });
      if (delivery?.skipped) {
        this.logger.warn('E-mail de definição de senha não enviado: SMTP não configurado.');
        await this.prisma.passwordSetupToken.delete({ where: { id: setupToken.id } });
        return { emailSent: false, email: usuario.email };
      }
      await this.prisma.passwordSetupToken.updateMany({
        where: { usuarioId: usuario.id, tipo, usadoEm: null, id: { not: setupToken.id } },
        data: { usadoEm: new Date() },
      });
      return { emailSent: true, email: usuario.email, expiresAt: expiraEm };
    } catch (error) {
      try {
        await this.prisma.passwordSetupToken.delete({ where: { id: setupToken.id } });
      } catch (cleanupError) {
        this.logger.error('Falha ao remover token após erro de envio.', cleanupError instanceof Error ? cleanupError.stack : String(cleanupError));
      }
      throw error;
    }
  }

  private async findActiveUser(userId: string) {
    if (typeof userId !== 'string' || !/^[1-9]\d*$/.test(userId)) {
      throw new UnauthorizedException('Usuário inválido');
    }
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: BigInt(userId) },
      include: usuarioComPerfis,
    });
    if (!usuario || usuario.ativo !== true || usuario.primeiroAcesso) {
      throw new UnauthorizedException('Usuário indisponível');
    }
    return usuario;
  }

  private getPerfis(usuario: UsuarioComPerfis): UserRole[] {
    const perfis: UserRole[] = [];
    for (const { perfil } of usuario.perfis) {
      if (!isUserRole(perfil.nome)) {
        this.logger.error(`Perfil inválido para o usuário ${usuario.id.toString()}.`);
        throw new UnauthorizedException('Perfil de acesso inválido');
      }
      perfis.push(perfil.nome);
    }
    if (perfis.length === 0) {
      throw new UnauthorizedException('Usuário sem perfil de acesso');
    }
    return perfis;
  }

  private serializeUser(usuario: UsuarioComPerfis, perfis: UserRole[]) {
    return {
      id: usuario.id.toString(),
      email: usuario.email,
      nome: usuario.nome,
      perfis,
      ...(perfis.length === 1 && { role: perfis[0] }),
      primeiroAcesso: usuario.primeiroAcesso,
    };
  }

  private generateTokens(sub: string, email: string, perfis: UserRole[]) {
    const claims = { sub, email, perfis };
    return {
      accessToken: this.jwtService.sign({ ...claims, tokenUse: 'access' }, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRATION') || '15m',
      }),
      refreshToken: this.jwtService.sign({ ...claims, tokenUse: 'refresh' }, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
      }),
    };
  }

  private assertStrongPassword(password: string) {
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(password)) {
      throw new BadRequestException('A senha deve ter ao menos 12 caracteres, com maiúscula, minúscula, número e símbolo.');
    }
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);
  }
}
