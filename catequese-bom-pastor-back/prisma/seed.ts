import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const perfis = ['ADMINISTRADOR', 'SECRETARIA', 'COORDENADOR', 'RESPONSAVEL', 'CATEQUISTA'] as const;
type Perfil = (typeof perfis)[number];
type PerfilOperador = 'ADMINISTRADOR' | 'SECRETARIA' | 'COORDENADOR';

const operadores: { perfil: PerfilOperador; nome: string; email: string; senhaEnv: string }[] = [
  { perfil: 'ADMINISTRADOR', nome: 'Administrador', email: 'admin@catequese.com', senhaEnv: 'SEED_ADMIN_SENHA' },
  { perfil: 'SECRETARIA', nome: 'Secretaria', email: 'secretaria@catequese.com', senhaEnv: 'SEED_SECRETARIA_SENHA' },
  { perfil: 'COORDENADOR', nome: 'Coordenador', email: 'coordenador@catequese.com', senhaEnv: 'SEED_COORDENADOR_SENHA' },
];

const etapas = ['Primeira Eucaristia I', 'Primeira Eucaristia II', 'Crisma I', 'Crisma II'];

const cenarios = [
  {
    chave: 'PENDENTE', responsavelNome: 'Ana Souza', responsavelCpf: '11111111111',
    responsavelEmail: 'ana.souza@email.com', responsavelTelefone: '11999999991',
    catequizandoNome: 'Lucas Souza', etapa: 'Primeira Eucaristia I',
    documentos: ['CERTIDAO_NASCIMENTO', 'COMPROVANTE_ENDERECO'],
    decisoes: [],
  },
  {
    chave: 'AGUARDANDO_COORDENADOR', responsavelNome: 'Carlos Oliveira', responsavelCpf: '22222222222',
    responsavelEmail: 'carlos.oliveira@example.invalid', responsavelTelefone: '11999999992',
    catequizandoNome: 'Mariana Oliveira', etapa: 'Primeira Eucaristia II',
    documentos: ['CERTIDAO_NASCIMENTO', 'COMPROVANTE_ENDERECO', 'CERTIFICADO_BATISMO'],
    decisoes: [{ perfil: 'SECRETARIA' as const, resultado: 'DOCUMENTACAO_OK', parecer: 'Documentação conferida e aprovada pela Secretaria.' }],
  },
  {
    chave: 'APROVADA', responsavelNome: 'Fernanda Lima', responsavelCpf: '33333333333',
    responsavelEmail: 'fernanda.lima@example.invalid', responsavelTelefone: '11999999993',
    catequizandoNome: 'Pedro Lima', etapa: 'Crisma I',
    documentos: ['CERTIDAO_NASCIMENTO', 'COMPROVANTE_ENDERECO', 'CERTIFICADO_BATISMO'],
    decisoes: [
      { perfil: 'SECRETARIA' as const, resultado: 'DOCUMENTACAO_OK', parecer: 'Documentação validada.' },
      { perfil: 'COORDENADOR' as const, resultado: 'APROVADA', parecer: 'Aprovada conforme análise.' },
    ],
  },
];

export async function seed(prisma: PrismaClient, env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== 'development' || env.SEED_DESENVOLVIMENTO !== 'true') {
    throw new Error('Seed permitido apenas com NODE_ENV=development e SEED_DESENVOLVIMENTO=true em banco de teste.');
  }
  const senhas = operadores.map(({ senhaEnv }) => {
    const senha = env[senhaEnv];
    if (!senha || Buffer.byteLength(senha, 'utf8') > 72) {
      throw new Error(`Informe ${senhaEnv} com até 72 bytes.`);
    }
    return senha;
  });
  const hashes = await Promise.all(senhas.map((senha) => bcrypt.hash(senha, 12)));

  const mensagens = await prisma.$transaction(async (tx) => {
    const logs: string[] = [];
    const perfilIds = new Map<Perfil, bigint>();
    for (const nome of perfis) {
      const perfil = await tx.perfil.upsert({
        where: { nome }, create: { nome }, update: {}, select: { id: true },
      });
      perfilIds.set(nome, perfil.id);
      logs.push(`Perfil ${nome} disponível.`);
    }

    const usuarioIds = new Map<PerfilOperador, bigint>();
    for (const [index, operador] of operadores.entries()) {
      const perfilId = perfilIds.get(operador.perfil);
      if (perfilId === undefined) throw new Error(`Perfil ${operador.perfil} não encontrado.`);
      const existente = await tx.usuario.findUnique({
        where: { email: operador.email },
        select: { id: true },
      });
      const usuario = await tx.usuario.upsert({
        where: { email: operador.email },
        update: {},
        create: {
          nome: operador.nome, email: operador.email, senha: hashes[index],
          ativo: true, primeiroAcesso: false,
          perfis: { create: { perfilId } },
        },
        select: { id: true, ativo: true, primeiroAcesso: true, senha: true, perfis: { select: { perfilId: true } } },
      });
      if (usuario.ativo !== true || usuario.primeiroAcesso ||
        usuario.perfis.length !== 1 || usuario.perfis[0].perfilId !== perfilId ||
        !(await bcrypt.compare(senhas[index], usuario.senha))) {
        throw new Error(`Usuário ${operador.email} já existe com credenciais ou perfil diferentes; nenhum dado foi alterado.`);
      }
      usuarioIds.set(operador.perfil, usuario.id);
      logs.push(`Usuário ${operador.perfil} ${existente ? 'preservado' : 'criado'}.`);
    }

    const etapaIds = new Map<string, bigint>();
    for (const [index, nome] of etapas.entries()) {
      const existentes = await tx.etapaCatequetica.findMany({ where: { nome }, select: { id: true } });
      if (existentes.length > 1) throw new Error(`Há etapas duplicadas com o nome ${nome}.`);
      const etapa = existentes.length === 0
        ? await tx.etapaCatequetica.create({ data: { nome, ordem: index + 1, ativa: true }, select: { id: true } })
        : await tx.etapaCatequetica.upsert({
          where: { id: existentes[0].id },
          create: { nome, ordem: index + 1, ativa: true },
          update: { ordem: index + 1, ativa: true },
          select: { id: true },
        });
      etapaIds.set(nome, etapa.id);
    }
    logs.push('Etapas catequéticas disponíveis.');

    for (const cenario of cenarios) {
      const marcador = `SEED_DESENVOLVIMENTO_V1:${cenario.chave}`;
      const existentes = await tx.matricula.findMany({ where: { observacao: marcador }, select: { id: true } });
      if (existentes.length > 1) throw new Error(`Há matrículas duplicadas para ${marcador}.`);
      if (existentes.length === 1) {
        logs.push(`Matrícula ${cenario.chave} já existe; alterações preservadas.`);
        continue;
      }
      const etapaId = etapaIds.get(cenario.etapa);
      if (etapaId === undefined) throw new Error(`Etapa ${cenario.etapa} não encontrada.`);
      const decisoes = cenario.decisoes.map((decisao) => {
        const usuarioId = usuarioIds.get(decisao.perfil);
        if (usuarioId === undefined) throw new Error(`Usuário ${decisao.perfil} não encontrado.`);
        return { usuarioId, etapa: decisao.perfil, resultado: decisao.resultado, parecer: decisao.parecer };
      });
      await tx.matricula.create({
        data: {
          status: cenario.chave,
          dataAprovacao: cenario.chave === 'APROVADA' ? new Date() : null,
          observacao: marcador,
          responsavelNome: cenario.responsavelNome,
          responsavelCpf: cenario.responsavelCpf,
          responsavelEmail: cenario.responsavelEmail,
          responsavelTelefone: cenario.responsavelTelefone,
          responsavelWhatsapp: cenario.responsavelTelefone,
          responsavelParentesco: 'Responsável',
          responsavelDataNascimento: new Date('1985-01-01T00:00:00.000Z'),
          catequizandoNome: cenario.catequizandoNome,
          catequizandoDataNascimento: new Date('2015-01-01T00:00:00.000Z'),
          catequizandoEndereco: 'Endereço de teste',
          catequizandoTelefoneEmergencia: cenario.responsavelTelefone,
          etapaId,
          documentos: {
            create: cenario.documentos.map((tipoDocumento) => ({
              tipoDocumento, nomeArquivo: `${tipoDocumento.toLowerCase()}.pdf`, status: 'PENDENTE',
            })),
          },
          decisoes: { create: decisoes },
        },
      });
      logs.push(`Matrícula ${cenario.chave} criada.`);
    }
    return logs;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });

  for (const mensagem of mensagens) console.log(mensagem);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await seed(prisma);
    console.log('Seed de desenvolvimento concluído.');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error('Erro ao executar o seed:', error);
    process.exitCode = 1;
  });
}
