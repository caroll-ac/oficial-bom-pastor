import { randomBytes } from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seed } from '../prisma/seed';

describe('seed de desenvolvimento', () => {
  const senha = () => randomBytes(18).toString('hex');
  const env = {
    NODE_ENV: 'development',
    SEED_DESENVOLVIMENTO: 'true',
    SEED_ADMIN_SENHA: senha(),
    SEED_SECRETARIA_SENHA: senha(),
    SEED_COORDENADOR_SENHA: senha(),
  };
  let tx: {
    perfil: { upsert: jest.Mock };
    usuario: { findUnique: jest.Mock; upsert: jest.Mock };
    etapaCatequetica: { findMany: jest.Mock; create: jest.Mock; upsert: jest.Mock };
    matricula: { findMany: jest.Mock; create: jest.Mock };
  };
  let prisma: { $transaction: jest.Mock };
  let client: PrismaClient;
  let usuarios: Map<string, { id: bigint; ativo: boolean; primeiroAcesso: boolean; senha: string; perfis: { perfilId: bigint }[] }>;

  beforeEach(() => {
    const perfis = new Map<string, bigint>();
    usuarios = new Map();
    const etapas = new Map<string, { id: bigint }>();
    const matriculas = new Map<string, { id: bigint }>();
    let id = 0n;
    const nextId = () => ++id;
    tx = {
      perfil: { upsert: jest.fn(async ({ where }) => {
        if (!perfis.has(where.nome)) perfis.set(where.nome, nextId());
        return { id: perfis.get(where.nome) };
      }) },
      usuario: {
        findUnique: jest.fn(async ({ where }) => usuarios.get(where.email) ?? null),
        upsert: jest.fn(async ({ where, create }) => {
          if (!usuarios.has(where.email)) {
            usuarios.set(where.email, {
              id: nextId(), ativo: create.ativo, primeiroAcesso: create.primeiroAcesso,
              senha: create.senha, perfis: [{ perfilId: create.perfis.create.perfilId }],
            });
          }
          return usuarios.get(where.email);
        }),
      },
      etapaCatequetica: {
        findMany: jest.fn(async ({ where }) => etapas.has(where.nome) ? [etapas.get(where.nome)] : []),
        create: jest.fn(async ({ data }) => {
          const etapa = { id: nextId() };
          etapas.set(data.nome, etapa);
          return etapa;
        }),
        upsert: jest.fn(async ({ where }) => ({ id: where.id })),
      },
      matricula: {
        findMany: jest.fn(async ({ where }) => matriculas.has(where.observacao) ? [matriculas.get(where.observacao)] : []),
        create: jest.fn(async ({ data }) => {
          const matricula = { id: nextId() };
          matriculas.set(data.observacao, matricula);
          return matricula;
        }),
      },
    };
    prisma = { $transaction: jest.fn(async (callback) => callback(tx)) };
    client = prisma as unknown as PrismaClient;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('cria usuários com bcrypt, quatro etapas e os três cenários com histórico', async () => {
    await seed(client, env);
    expect(tx.perfil.upsert).toHaveBeenCalledTimes(5);
    expect(tx.usuario.upsert).toHaveBeenCalledTimes(3);
    for (const [email, segredo] of [
      ['admin@catequese.com', env.SEED_ADMIN_SENHA],
      ['secretaria@catequese.com', env.SEED_SECRETARIA_SENHA],
      ['coordenador@catequese.com', env.SEED_COORDENADOR_SENHA],
    ]) {
      expect(await bcrypt.compare(segredo, usuarios.get(email)!.senha)).toBe(true);
    }
    expect(tx.etapaCatequetica.create).toHaveBeenCalledTimes(4);
    expect(tx.matricula.create).toHaveBeenCalledTimes(3);
    const [pendente, aguardando, aprovada] = tx.matricula.create.mock.calls.map(([args]) => args.data);
    expect(pendente).toMatchObject({
      status: 'PENDENTE', responsavelNome: 'Ana Souza', catequizandoNome: 'Lucas Souza',
      documentos: { create: [{ tipoDocumento: 'CERTIDAO_NASCIMENTO' }, { tipoDocumento: 'COMPROVANTE_ENDERECO' }] },
      decisoes: { create: [] },
    });
    expect(aguardando).toMatchObject({
      status: 'AGUARDANDO_COORDENADOR', responsavelNome: 'Carlos Oliveira', catequizandoNome: 'Mariana Oliveira',
      decisoes: { create: [{ etapa: 'SECRETARIA', usuarioId: usuarios.get('secretaria@catequese.com')!.id, resultado: 'DOCUMENTACAO_OK' }] },
    });
    expect(aprovada).toMatchObject({
      status: 'APROVADA', dataAprovacao: expect.any(Date), responsavelNome: 'Fernanda Lima',
      catequizandoNome: 'Pedro Lima', decisoes: { create: [
        { etapa: 'SECRETARIA', usuarioId: usuarios.get('secretaria@catequese.com')!.id },
        { etapa: 'COORDENADOR', usuarioId: usuarios.get('coordenador@catequese.com')!.id, resultado: 'APROVADA' },
      ] },
    });
    expect(aguardando.documentos.create).toHaveLength(3);
    expect(aprovada.documentos.create).toHaveLength(3);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000,
    });
  }, 30000);

  it('repetição preserva contas e matrículas, sem criar duplicatas', async () => {
    await seed(client, env);
    await seed(client, env);
    expect(tx.matricula.create).toHaveBeenCalledTimes(3);
    expect(tx.etapaCatequetica.create).toHaveBeenCalledTimes(4);
    expect(tx.etapaCatequetica.upsert).toHaveBeenCalledTimes(4);
    expect(tx.usuario.upsert.mock.calls.slice(3).every(([args]) => Object.keys(args.update).length === 0)).toBe(true);
  }, 30000);

  it('recusa usuário existente incompatível em vez de alterar senha ou perfil', async () => {
    usuarios.set('admin@catequese.com', {
      id: 99n, ativo: false, primeiroAcesso: false, senha: 'hash', perfis: [],
    });
    await expect(seed(client, env)).rejects.toThrow('credenciais ou perfil diferentes');
    expect(tx.matricula.create).not.toHaveBeenCalled();
  }, 30000);

  it.each([
    { ...env, NODE_ENV: 'production' },
    { ...env, SEED_DESENVOLVIMENTO: undefined },
    { ...env, SEED_COORDENADOR_SENHA: undefined },
    { ...env, SEED_SECRETARIA_SENHA: 'x'.repeat(73) },
  ])('rejeita ambiente ou senhas inválidas antes de consultar o banco', async (config) => {
    await expect(seed(client, config)).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('recusa etapas duplicadas em vez de escolher uma arbitrariamente', async () => {
    tx.etapaCatequetica.findMany.mockResolvedValue([{ id: 1n }, { id: 2n }]);
    await expect(seed(client, env)).rejects.toThrow('etapas duplicadas');
    expect(tx.matricula.create).not.toHaveBeenCalled();
  }, 30000);
});
