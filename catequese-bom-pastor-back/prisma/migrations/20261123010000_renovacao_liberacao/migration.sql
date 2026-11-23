CREATE TABLE "renovacao_configuracao" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "data_liberacao" DATE,
  CONSTRAINT "renovacao_configuracao_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "renovacao_configuracao_singleton" CHECK ("id" = 1)
);

INSERT INTO "renovacao_configuracao" ("id") VALUES (1);
