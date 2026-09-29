-- Migration: mensagens dos convidados para os noivos
-- Execute com: psql -h HOST -U USER -d casamento -f scripts/criar-tabela-mensagens.sql

CREATE TABLE IF NOT EXISTS mensagens (
  id          SERIAL      PRIMARY KEY,
  nome        TEXT        NOT NULL,
  texto       TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
