CREATE TABLE "renovacao" (
  "id" BIGSERIAL PRIMARY KEY,
  "catequizando_id" BIGINT NOT NULL REFERENCES "catequizando"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "responsavel_id" BIGINT NOT NULL REFERENCES "responsavel"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "ano" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "comprovante_key" TEXT NOT NULL,
  "observacoes" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "renovacao_catequizando_id_ano_key" ON "renovacao"("catequizando_id", "ano");
CREATE INDEX "renovacao_responsavel_id_idx" ON "renovacao"("responsavel_id");

CREATE TABLE "renovacao_documento" (
  "id" BIGSERIAL PRIMARY KEY,
  "renovacao_id" BIGINT NOT NULL REFERENCES "renovacao"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "tipo" TEXT NOT NULL,
  "file_key" TEXT NOT NULL
);
CREATE UNIQUE INDEX "renovacao_documento_renovacao_id_tipo_key" ON "renovacao_documento"("renovacao_id", "tipo");
