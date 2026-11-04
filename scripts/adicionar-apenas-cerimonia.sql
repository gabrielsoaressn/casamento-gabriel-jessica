-- Migration: convidado pode responder que vai só à cerimônia (sem a recepção).
-- vai_comparecer = true + apenas_cerimonia = true → só a cerimônia.
-- Rode ANTES de subir a versão da API que usa a coluna:
--   psql -h HOST -U USER -d casamento -f scripts/adicionar-apenas-cerimonia.sql

ALTER TABLE convidados
  ADD COLUMN IF NOT EXISTS apenas_cerimonia BOOLEAN NOT NULL DEFAULT false;
