-- Migration: Sistema de RSVP para o casamento Gabriel & Jéssica
-- Execute com: psql -h HOST -U USER -d casamento -f scripts/criar-tabelas-rsvp.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de convites (um por família/grupo)
CREATE TABLE IF NOT EXISTS convites (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo       TEXT        NOT NULL,
  entrega      TEXT        NOT NULL CHECK (entrega IN ('papel', 'digital')),
  grupo        TEXT        NOT NULL,
  confirmado_em TIMESTAMPTZ NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice único case-insensitive para busca segura pelo código
CREATE UNIQUE INDEX IF NOT EXISTS idx_convites_codigo_lower
  ON convites (LOWER(codigo));

-- Tabela de convidados (um por pessoa dentro do convite)
CREATE TABLE IF NOT EXISTS convidados (
  id              UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  convite_id      UUID      NOT NULL REFERENCES convites(id) ON DELETE CASCADE,
  nome            TEXT      NOT NULL,
  vai_comparecer  BOOLEAN   NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_convidados_convite_id
  ON convidados (convite_id);

COMMIT;
