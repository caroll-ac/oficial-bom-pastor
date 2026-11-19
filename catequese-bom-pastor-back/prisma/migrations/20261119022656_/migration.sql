-- CreateEnum
CREATE TYPE "TipoPasswordSetup" AS ENUM ('PRIMEIRO_ACESSO', 'RESET_SENHA');

-- CreateTable
CREATE TABLE "usuario" (
    "id" BIGSERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "telefone" TEXT,
    "ativo" BOOLEAN DEFAULT true,
    "data_cadastro" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "ultimo_acesso" TIMESTAMP(3),
    "primeiro_acesso" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfil" (
    "id" BIGSERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "perfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_perfil" (
    "usuario_id" BIGINT NOT NULL,
    "perfil_id" BIGINT NOT NULL,

    CONSTRAINT "usuario_perfil_pkey" PRIMARY KEY ("usuario_id","perfil_id")
);

-- CreateTable
CREATE TABLE "responsavel" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" BIGINT NOT NULL,
    "cpf" TEXT NOT NULL,
    "parentesco" TEXT,

    CONSTRAINT "responsavel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catequista" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" BIGINT NOT NULL,
    "formacao" TEXT,
    "data_ingresso" TIMESTAMP(3),

    CONSTRAINT "catequista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matricula" (
    "id" BIGSERIAL NOT NULL,
    "data_solicitacao" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "observacao" TEXT,
    "data_aprovacao" TIMESTAMP(3),
    "responsavel_id" BIGINT,
    "responsavel_nome" TEXT NOT NULL,
    "responsavel_cpf" TEXT NOT NULL,
    "responsavel_parentesco" TEXT NOT NULL,
    "responsavel_data_nascimento" TIMESTAMP(3) NOT NULL,
    "responsavel_telefone" TEXT NOT NULL,
    "responsavel_whatsapp" TEXT NOT NULL,
    "responsavel_email" TEXT NOT NULL,
    "catequizando_nome" TEXT NOT NULL,
    "catequizando_data_nascimento" TIMESTAMP(3) NOT NULL,
    "catequizando_endereco" TEXT NOT NULL,
    "catequizando_telefone_emergencia" TEXT NOT NULL,
    "etapa_id" BIGINT NOT NULL,

    CONSTRAINT "matricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matricula_decisao" (
    "id" BIGSERIAL NOT NULL,
    "matricula_id" BIGINT NOT NULL,
    "usuario_id" BIGINT NOT NULL,
    "etapa" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "parecer" TEXT,
    "decidido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matricula_decisao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_setup_token" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" BIGINT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "usado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" "TipoPasswordSetup",

    CONSTRAINT "password_setup_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catequizando" (
    "id" BIGSERIAL NOT NULL,
    "matricula_id" BIGINT,
    "responsavel_id" BIGINT NOT NULL,
    "turma_id" BIGINT,
    "nome" TEXT NOT NULL,
    "data_nascimento" TIMESTAMP(3) NOT NULL,
    "sexo" TEXT,
    "endereco" TEXT,
    "telefone_emergencia" TEXT,
    "situacao" TEXT,
    "data_ingresso" TIMESTAMP(3),

    CONSTRAINT "catequizando_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turma" (
    "id" BIGSERIAL NOT NULL,
    "etapa_id" BIGINT NOT NULL,
    "nome" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "horario" TEXT,
    "local" TEXT,
    "ativa" BOOLEAN DEFAULT true,

    CONSTRAINT "turma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapa_catequetica" (
    "id" BIGSERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL,
    "ativa" BOOLEAN DEFAULT true,

    CONSTRAINT "etapa_catequetica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento" (
    "id" BIGSERIAL NOT NULL,
    "matricula_id" BIGINT NOT NULL,
    "nome_arquivo" TEXT NOT NULL,
    "tipo_documento" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "parecer" TEXT,
    "data_envio" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evento" (
    "id" BIGSERIAL NOT NULL,
    "turma_id" BIGINT,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "data_evento" TIMESTAMP(3) NOT NULL,
    "local" TEXT,
    "obrigatorio" BOOLEAN DEFAULT true,

    CONSTRAINT "evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comunicado" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" BIGINT NOT NULL,
    "turma_id" BIGINT,
    "tipo_comunicado" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "data_publicacao" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comunicado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frequencia" (
    "id" BIGSERIAL NOT NULL,
    "catequizando_id" BIGINT NOT NULL,
    "encontro_id" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "data_registro" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frequencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reposicao" (
    "id" BIGSERIAL NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "local" TEXT,
    "observacao" TEXT,

    CONSTRAINT "reposicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "justificativa" (
    "id" BIGSERIAL NOT NULL,
    "frequencia_id" BIGINT NOT NULL,
    "motivo" TEXT NOT NULL,
    "arquivo_comprovante" TEXT,
    "analise" TEXT,
    "status" TEXT DEFAULT 'PENDENTE',
    "data_envio" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "justificativa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sacramento" (
    "id" BIGSERIAL NOT NULL,
    "catequizando_id" BIGINT NOT NULL,
    "tipo" TEXT NOT NULL,
    "data_recebimento" TIMESTAMP(3),
    "paroquia" TEXT,
    "comprovante" TEXT,

    CONSTRAINT "sacramento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_apoio" (
    "id" BIGSERIAL NOT NULL,
    "conteudo_id" BIGINT NOT NULL,
    "titulo" TEXT NOT NULL,
    "categoria" TEXT,
    "arquivo" TEXT,

    CONSTRAINT "material_apoio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conteudo_catequetico" (
    "id" BIGSERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "data_criacao" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conteudo_catequetico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disponibilizacao_conteudo" (
    "id" BIGSERIAL NOT NULL,
    "conteudo_id" BIGINT NOT NULL,
    "catequista_id" BIGINT NOT NULL,
    "usuario_liberador_id" BIGINT NOT NULL,
    "data_disponibilizacao" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "ativo" BOOLEAN DEFAULT true,
    "observacao" TEXT,

    CONSTRAINT "disponibilizacao_conteudo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encontro_catequetico" (
    "id" BIGSERIAL NOT NULL,
    "turma_id" BIGINT NOT NULL,
    "conteudo_id" BIGINT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tema" TEXT,
    "observacoes" TEXT,

    CONSTRAINT "encontro_catequetico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapa_conteudo" (
    "etapa_id" BIGINT NOT NULL,
    "conteudo_id" BIGINT NOT NULL,

    CONSTRAINT "etapa_conteudo_pkey" PRIMARY KEY ("etapa_id","conteudo_id")
);

-- CreateTable
CREATE TABLE "participacao_evento" (
    "evento_id" BIGINT NOT NULL,
    "catequizando_id" BIGINT NOT NULL,
    "presente" BOOLEAN DEFAULT false,

    CONSTRAINT "participacao_evento_pkey" PRIMARY KEY ("evento_id","catequizando_id")
);

-- CreateTable
CREATE TABLE "catequizando_reposicao" (
    "catequizando_id" BIGINT NOT NULL,
    "reposicao_id" BIGINT NOT NULL,

    CONSTRAINT "catequizando_reposicao_pkey" PRIMARY KEY ("catequizando_id","reposicao_id")
);

-- CreateTable
CREATE TABLE "turma_catequista" (
    "turma_id" BIGINT NOT NULL,
    "catequista_id" BIGINT NOT NULL,

    CONSTRAINT "turma_catequista_pkey" PRIMARY KEY ("turma_id","catequista_id")
);

-- CreateTable
CREATE TABLE "mensagem" (
    "id" BIGSERIAL NOT NULL,
    "remetente_id" BIGINT NOT NULL,
    "destinatario_id" BIGINT NOT NULL,
    "texto" TEXT NOT NULL,
    "lida" BOOLEAN DEFAULT false,
    "data_envio" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "nome" ON "perfil"("nome");

-- CreateIndex
CREATE INDEX "idx_usuario_perfil_perfil_id" ON "usuario_perfil"("perfil_id");

-- CreateIndex
CREATE UNIQUE INDEX "responsavel_usuario_id_key" ON "responsavel"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "catequista_usuario_id_key" ON "catequista"("usuario_id");

-- CreateIndex
CREATE INDEX "idx_matricula_responsavel" ON "matricula"("responsavel_id");

-- CreateIndex
CREATE INDEX "idx_matricula_etapa" ON "matricula"("etapa_id");

-- CreateIndex
CREATE INDEX "idx_matricula_decisao_matricula_data" ON "matricula_decisao"("matricula_id", "decidido_em");

-- CreateIndex
CREATE INDEX "idx_matricula_decisao_usuario" ON "matricula_decisao"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_password_setup_token_hash" ON "password_setup_token"("token_hash");

-- CreateIndex
CREATE INDEX "idx_password_setup_token_usuario_expira" ON "password_setup_token"("usuario_id", "expira_em");

-- CreateIndex
CREATE UNIQUE INDEX "catequizando_matricula_id_key" ON "catequizando"("matricula_id");

-- CreateIndex
CREATE INDEX "idx_catequizando_responsavel" ON "catequizando"("responsavel_id");

-- CreateIndex
CREATE INDEX "idx_catequizando_turma" ON "catequizando"("turma_id");

-- CreateIndex
CREATE INDEX "idx_turma_etapa" ON "turma"("etapa_id");

-- CreateIndex
CREATE INDEX "idx_documento_matricula" ON "documento"("matricula_id");

-- CreateIndex
CREATE INDEX "idx_evento_turma" ON "evento"("turma_id");

-- CreateIndex
CREATE INDEX "idx_comunicado_usuario" ON "comunicado"("usuario_id");

-- CreateIndex
CREATE INDEX "idx_comunicado_turma" ON "comunicado"("turma_id");

-- CreateIndex
CREATE INDEX "idx_freq_encontro" ON "frequencia"("encontro_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_frequencia" ON "frequencia"("catequizando_id", "encontro_id");

-- CreateIndex
CREATE INDEX "idx_justificativa_frequencia" ON "justificativa"("frequencia_id");

-- CreateIndex
CREATE INDEX "idx_sacramento_catequizando" ON "sacramento"("catequizando_id");

-- CreateIndex
CREATE INDEX "idx_material_conteudo" ON "material_apoio"("conteudo_id");

-- CreateIndex
CREATE INDEX "idx_disp_conteudo" ON "disponibilizacao_conteudo"("conteudo_id");

-- CreateIndex
CREATE INDEX "idx_disp_catequista" ON "disponibilizacao_conteudo"("catequista_id");

-- CreateIndex
CREATE INDEX "idx_disp_usuario" ON "disponibilizacao_conteudo"("usuario_liberador_id");

-- CreateIndex
CREATE INDEX "idx_encontro_turma" ON "encontro_catequetico"("turma_id");

-- CreateIndex
CREATE INDEX "idx_encontro_conteudo" ON "encontro_catequetico"("conteudo_id");

-- CreateIndex
CREATE INDEX "idx_ec_conteudo" ON "etapa_conteudo"("conteudo_id");

-- CreateIndex
CREATE INDEX "idx_pe_catequizando" ON "participacao_evento"("catequizando_id");

-- CreateIndex
CREATE INDEX "idx_cr_reposicao" ON "catequizando_reposicao"("reposicao_id");

-- CreateIndex
CREATE INDEX "idx_tc_catequista" ON "turma_catequista"("catequista_id");

-- CreateIndex
CREATE INDEX "idx_msg_remetente" ON "mensagem"("remetente_id");

-- CreateIndex
CREATE INDEX "idx_msg_destinatario" ON "mensagem"("destinatario_id");

-- AddForeignKey
ALTER TABLE "usuario_perfil" ADD CONSTRAINT "fk_usuario_perfil_perfil" FOREIGN KEY ("perfil_id") REFERENCES "perfil"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuario_perfil" ADD CONSTRAINT "fk_usuario_perfil_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "responsavel" ADD CONSTRAINT "fk_responsavel_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "catequista" ADD CONSTRAINT "fk_catequista_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matricula" ADD CONSTRAINT "fk_matricula_etapa" FOREIGN KEY ("etapa_id") REFERENCES "etapa_catequetica"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matricula" ADD CONSTRAINT "fk_matricula_responsavel" FOREIGN KEY ("responsavel_id") REFERENCES "responsavel"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matricula_decisao" ADD CONSTRAINT "fk_matricula_decisao_matricula" FOREIGN KEY ("matricula_id") REFERENCES "matricula"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matricula_decisao" ADD CONSTRAINT "fk_matricula_decisao_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "password_setup_token" ADD CONSTRAINT "fk_password_setup_token_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "catequizando" ADD CONSTRAINT "fk_catequizando_matricula" FOREIGN KEY ("matricula_id") REFERENCES "matricula"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "catequizando" ADD CONSTRAINT "fk_catequizando_responsavel" FOREIGN KEY ("responsavel_id") REFERENCES "responsavel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "catequizando" ADD CONSTRAINT "fk_catequizando_turma" FOREIGN KEY ("turma_id") REFERENCES "turma"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "turma" ADD CONSTRAINT "fk_turma_etapa" FOREIGN KEY ("etapa_id") REFERENCES "etapa_catequetica"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "fk_documento_matricula" FOREIGN KEY ("matricula_id") REFERENCES "matricula"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "fk_evento_turma" FOREIGN KEY ("turma_id") REFERENCES "turma"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comunicado" ADD CONSTRAINT "fk_comunicado_turma" FOREIGN KEY ("turma_id") REFERENCES "turma"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comunicado" ADD CONSTRAINT "fk_comunicado_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "frequencia" ADD CONSTRAINT "fk_freq_catequizando" FOREIGN KEY ("catequizando_id") REFERENCES "catequizando"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "frequencia" ADD CONSTRAINT "fk_freq_encontro" FOREIGN KEY ("encontro_id") REFERENCES "encontro_catequetico"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "justificativa" ADD CONSTRAINT "fk_justificativa_frequencia" FOREIGN KEY ("frequencia_id") REFERENCES "frequencia"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sacramento" ADD CONSTRAINT "fk_sacramento_catequizando" FOREIGN KEY ("catequizando_id") REFERENCES "catequizando"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "material_apoio" ADD CONSTRAINT "fk_material_conteudo" FOREIGN KEY ("conteudo_id") REFERENCES "conteudo_catequetico"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "disponibilizacao_conteudo" ADD CONSTRAINT "fk_disp_catequista" FOREIGN KEY ("catequista_id") REFERENCES "catequista"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "disponibilizacao_conteudo" ADD CONSTRAINT "fk_disp_conteudo" FOREIGN KEY ("conteudo_id") REFERENCES "conteudo_catequetico"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "disponibilizacao_conteudo" ADD CONSTRAINT "fk_disp_usuario" FOREIGN KEY ("usuario_liberador_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "encontro_catequetico" ADD CONSTRAINT "fk_encontro_conteudo" FOREIGN KEY ("conteudo_id") REFERENCES "conteudo_catequetico"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "encontro_catequetico" ADD CONSTRAINT "fk_encontro_turma" FOREIGN KEY ("turma_id") REFERENCES "turma"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "etapa_conteudo" ADD CONSTRAINT "fk_ec_conteudo" FOREIGN KEY ("conteudo_id") REFERENCES "conteudo_catequetico"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "etapa_conteudo" ADD CONSTRAINT "fk_ec_etapa" FOREIGN KEY ("etapa_id") REFERENCES "etapa_catequetica"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "participacao_evento" ADD CONSTRAINT "fk_pe_catequizando" FOREIGN KEY ("catequizando_id") REFERENCES "catequizando"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "participacao_evento" ADD CONSTRAINT "fk_pe_evento" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "catequizando_reposicao" ADD CONSTRAINT "fk_cr_catequizando" FOREIGN KEY ("catequizando_id") REFERENCES "catequizando"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "catequizando_reposicao" ADD CONSTRAINT "fk_cr_reposicao" FOREIGN KEY ("reposicao_id") REFERENCES "reposicao"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "turma_catequista" ADD CONSTRAINT "fk_tc_catequista" FOREIGN KEY ("catequista_id") REFERENCES "catequista"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "turma_catequista" ADD CONSTRAINT "fk_tc_turma" FOREIGN KEY ("turma_id") REFERENCES "turma"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mensagem" ADD CONSTRAINT "fk_msg_destinatario" FOREIGN KEY ("destinatario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mensagem" ADD CONSTRAINT "fk_msg_remetente" FOREIGN KEY ("remetente_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
