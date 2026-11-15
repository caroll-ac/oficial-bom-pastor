# Catequese Bom Pastor - Backend API

Backend em NestJS para plataforma de gestão catequética.

## 📋 Requisitos

- Node.js 18+ (LTS)
- PostgreSQL 14+
- npm ou yarn

## 🚀 Instalação

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e configure as variáveis:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/catequese_db
JWT_SECRET=seu_secret_aqui
JWT_REFRESH_SECRET=seu_refresh_secret_aqui
# ... outras variáveis
```

### 3. Configurar banco de dados

#### Opção A: Usar Docker (Recomendado para desenvolvimento)

```bash
docker-compose up -d
```

#### Opção B: PostgreSQL local

Crie um banco de dados PostgreSQL e configure a `DATABASE_URL` no `.env`.

### 4. Executar migrations

```bash
npx prisma migrate dev
```

### 5. (Opcional) Seed de dados iniciais

Este seed é **exclusivo para um banco de desenvolvimento isolado**. Confirme a
`DATABASE_URL` antes de executá-lo; as variáveis abaixo não verificam o destino do banco.
Ele cria os cinco perfis, quatro etapas e três matrículas fictícias com metadados de
documentos e decisões. Os arquivos de documentos não são enviados.

As contas de teste são `admin@catequese.com`, `secretaria@catequese.com` e
`coordenador@catequese.com`. Defina suas senhas no ambiente, sem salvá-las no
repositório. Para execução no PowerShell:

```powershell
$env:NODE_ENV = 'development'
$env:SEED_DESENVOLVIMENTO = 'true'
$env:SEED_ADMIN_SENHA = Read-Host 'Senha do administrador de teste'
$env:SEED_SECRETARIA_SENHA = Read-Host 'Senha da secretaria de teste'
$env:SEED_COORDENADOR_SENHA = Read-Host 'Senha do coordenador de teste'
npx prisma db seed
```

As senhas devem ser não vazias e ter no máximo 72 bytes UTF-8. Se uma conta já
existir, o seed não altera a senha ou os perfis e falha caso ela não corresponda ao
perfil e à senha informados. Etapas existentes com os nomes previstos são ativadas e
têm a ordem atualizada. As matrículas são identificadas por um marcador em
`observacao` e preservadas nas próximas execuções, inclusive após decisões; não apague
o marcador. Execute sem concorrência: o schema não possui unicidade para nomes de
etapas nem para esse marcador. A transação reverte as alterações se houver erro.

### 6. Iniciar o servidor

#### Desenvolvimento

```bash
npm run start:dev
```

#### Produção

```bash
npm run build
npm run start:prod
```

## 📚 Documentação da API

Após iniciar o servidor, acesse:

- **API**: http://localhost:3000/api
- **Swagger Docs**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/health

## 🔐 Autenticação

A API usa `Usuario`, `UsuarioPerfil` e `Perfil` para autenticação e autorização. A criação de usuários e a emissão de convites de primeiro acesso dependem da adaptação dos módulos que criam usuários; não há endpoint de registro no Auth.

### Login

```bash
POST /api/auth/login
{
  "email": "usuario@example.com",
  "senha": "senha123"
}
```

Retorna:
```json
{
  "user": {
    "id": "1",
    "email": "usuario@example.com",
    "nome": "Nome do Usuário",
    "perfis": ["RESPONSAVEL"],
    "role": "RESPONSAVEL",
    "primeiroAcesso": false
  },
  "accessToken": "...",
  "refreshToken": "..."
}
```

O `id` é serializado como string para preservar a precisão de `BigInt`. O campo `role` é fornecido apenas para usuários com um único perfil, por compatibilidade; o JWT contém `sub`, `email`, `perfis` e `tokenUse`, além dos campos padrão de emissão e expiração. Tokens emitidos pelo contrato antigo exigem novo login.

### Senhas e renovação

- `POST /api/auth/refresh`: recebe `{ "refreshToken": "..." }` e consulta os perfis atuais antes de emitir novos tokens.
- `POST /api/auth/forgot-password`: recebe `{ "email": "..." }` e responde com mensagem genérica.
- `GET /api/auth/password-setup?token=...` e `POST /api/auth/password-setup`: validam e consomem tokens de primeiro acesso ou recuperação. O POST recebe `token`, `senha` e `confirmacao`.
- `POST /api/auth/reset-password`: recebe `token` e `novaSenha` e aceita somente tokens de recuperação.

Os tokens de senha são armazenados como hash, expiram em 24 horas e são de uso único. O refresh é stateless e não possui revogação individual persistente. O endpoint de edição de perfil rejeita operações de foto enquanto o schema não tiver suporte para elas.

### Usar token nas requisições

Adicione o header:
```
Authorization: Bearer {accessToken}
```

## 👥 Tipos de Usuário

- `ADMINISTRADOR`, `COORDENADOR`, `SECRETARIA`, `CATEQUISTA` e `RESPONSAVEL`.
- Os módulos legados ainda precisam ser adaptados para os novos IDs e múltiplos perfis; a presença de um perfil não significa que todas as telas antigas estejam prontas.

## 📦 Módulos Principais

### Auth
- Login e refresh token
- Primeiro acesso e recuperação de senha
- Perfil do usuário

### Matrículas — MVP

As rotas públicas usam o prefixo `/api`:

- `GET /api/etapas`: lista as etapas ativas. O `id` é uma string decimal.
- `POST /api/matriculas`: recebe JSON e cria uma matrícula com status `PENDENTE`.

Exemplo de corpo:

```json
{
  "responsavelNome": "Maria Silva",
  "responsavelCpf": "123.456.789-00",
  "responsavelParentesco": "Mãe",
  "responsavelDataNascimento": "1980-05-10",
  "responsavelTelefone": "11999999999",
  "responsavelWhatsapp": "11999999999",
  "responsavelEmail": "maria@example.com",
  "catequizandoNome": "Ana Silva",
  "catequizandoDataNascimento": "2015-03-20",
  "catequizandoEndereco": "Rua Exemplo, 10",
  "catequizandoTelefoneEmergencia": "11988888888",
  "etapaId": "1",
  "observacao": "Opcional",
  "documentos": [
    { "nomeArquivo": "certidao.pdf", "tipoDocumento": "CERTIDAO_NASCIMENTO" },
    { "nomeArquivo": "endereco.pdf", "tipoDocumento": "COMPROVANTE_ENDERECO" },
    { "nomeArquivo": "batismo.pdf", "tipoDocumento": "CERTIFICADO_BATISMO" }
  ]
}
```

Escolha `etapaId` a partir da lista de etapas ativas; IDs devem ser enviados como strings para preservar a precisão. As datas usam o formato `AAAA-MM-DD`. Todos os campos acima são obrigatórios, exceto `observacao`. CPF é obrigatório e limitado a 14 caracteres, sem validação de dígitos verificadores neste MVP.

A resposta contém `id` como string, `status` e `dataSolicitacao`. Os três tipos de documentos são obrigatórios e devem aparecer uma vez cada. Matrícula e metadados são gravados juntos; documentos começam com status `PENDENTE` e parecer `null`. Apenas metadados são recebidos: **não há upload ou armazenamento físico de arquivos neste MVP**. O endpoint não cria usuário, responsável ou catequizando, nem aprova a matrícula.

### Documentos da matrícula

- `POST /api/matriculas/:id/documentos`: registra metadados adicionais; exclusivo para `SECRETARIA`, `COORDENADOR` ou `ADMINISTRADOR`.
- `GET /api/matriculas/:id/documentos` e `GET /api/matriculas/:id/documentos/:documentoId`: equipe ou responsável autenticado vinculado a uma matrícula aprovada.
- `GET /api/matriculas/minhas`: lista as matrículas aprovadas vinculadas ao responsável autenticado.

As rotas acima exigem JWT. Não existe consulta pública de documentos nem envio físico posterior. A criação de matrículas agora exige o array `documentos`, portanto clientes do contrato anterior precisam ser atualizados.

### Turmas
- CRUD de turmas
- Listar catequizandos

### Catequizandos
- CRUD de catequizandos
- Relacionamento com turmas e responsáveis

### Inscrições
- Submeter inscrições
- Workflow de aprovação (SUBMITTED → APPROVED/REJECTED)
- Upload de documentos

### Pagamentos
- Registrar pagamentos
- Múltiplos métodos (PIX, Cartão, Dinheiro, Transferência)
- Relatórios financeiros

### Materiais e Documentos
- Upload de arquivos
- Controle de visibilidade
- Presigned URLs S3

### Cronograma e Calendário
- Eventos de turma e gerais
- Filtros por data

### Galeria
- Álbuns de fotos
- Upload de imagens

### Músicas
- Cadastro de músicas
- Links externos (YouTube, etc)

### Loja
- Itens à venda
- Ordens de compra
- Controle de estoque

### Dashboard
- Dashboards específicos por tipo de usuário
- Estatísticas e métricas

## 🧪 Testes

```bash
# Testes unitários
npm test

# Testes E2E
npm run test:e2e

# Coverage
npm run test:cov
```

## 📝 Scripts Úteis

```bash
# Gerar cliente Prisma
npm run prisma:generate

# Criar nova migration
npm run prisma:migrate

# Aplicar migrations em produção
npm run prisma:deploy

# Prisma Studio (GUI)
npm run prisma:studio

# Seed de dados
npm run prisma:seed

# Build
npm run build

# Lint
npm run lint

# Format
npm run format
```

## 🐳 Docker

### Build da imagem

```bash
docker build -t catequese-backend .
```

### Run com docker-compose

```bash
docker-compose up -d
```

## 🔧 Variáveis de Ambiente

### Obrigatórias

- `DATABASE_URL`: String de conexão PostgreSQL
- `JWT_SECRET`: Secret para access tokens
- `JWT_REFRESH_SECRET`: Secret para refresh tokens

### Opcionais

- `PORT`: Porta do servidor (padrão: 3000)
- `NODE_ENV`: Ambiente (development|production)
- `JWT_EXPIRATION`: Expiração do access token (padrão: 15m)
- `JWT_REFRESH_EXPIRATION`: Expiração do refresh token (padrão: 7d)
- `FRONTEND_URL`: URL do frontend para CORS

### Convites e criação de senha

As aprovações de pré-matrícula e inscrição de catequista enviam um link para criação de senha. Configure no `.env` do backend um servidor SMTP válido (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM`). Sem SMTP, a aprovação fica registrada, a tela administrativa informa que o e-mail não foi enviado e permite reenviar o convite após corrigir a configuração.

Os links expiram em 24 horas e só podem ser usados uma vez. A senha deve ter ao menos 12 caracteres, com letras maiúsculas e minúsculas, número e símbolo.
- `S3_*`: Configurações de upload S3/R2
- `RESEND_API_KEY`: API key para envio de emails
- `STRIPE_API_KEY`: API key do Stripe (pagamentos)

## 📖 Estrutura de Pastas

```
src/
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   └── prisma/
├── modules/
│   ├── auth/
│   ├── turmas/
│   ├── catequizandos/
│   ├── responsaveis/
│   ├── inscricoes/
│   ├── pagamentos/
│   ├── materiais/
│   ├── documentos/
│   ├── cronograma/
│   ├── calendario/
│   ├── galeria/
│   ├── musicas/
│   ├── loja/
│   ├── uploads/
│   ├── dashboard/
│   └── health/
├── app.module.ts
└── main.ts
```

## 🛡️ Segurança

- ✅ Senhas com bcrypt (10 rounds)
- ✅ JWT com expiração
- ✅ CORS configurado
- ✅ Helmet para headers de segurança
- ✅ Rate limiting
- ✅ Validação de inputs (class-validator)
- ✅ HTTPS em produção
- ✅ Variáveis sensíveis via .env

## 📊 Health Checks

```bash
# Basic health
GET /api/health

# Database health
GET /api/health/db
```

## 🚀 Deploy

### Railway

1. Configure as variáveis de ambiente
2. Conecte o repositório
3. Railway detectará automaticamente o Dockerfile

### Render

1. Crie um novo Web Service
2. Configure as variáveis de ambiente
3. Configure o build command: `npm install && npx prisma generate && npm run build`
4. Configure o start command: `npm run prisma:deploy && npm run start:prod`

### Heroku

```bash
heroku create catequese-backend
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
heroku run npm run prisma:deploy
```

## 📄 Licença

MIT

## 👨‍💻 Autor

Catequese Bom Pastor

## 🆘 Suporte

Para dúvidas ou problemas, abra uma issue no GitHub.
