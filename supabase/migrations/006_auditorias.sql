-- ============================================================
-- MIGRATION 006 — AUDITORIAS QUINZENAIS
-- ============================================================

-- ---- AGENDAMENTOS DE AUDITORIA ----
CREATE TABLE auditoria_agendamentos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id     UUID NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  data_agendada  DATE NOT NULL,
  data_realizada TIMESTAMPTZ,
  auditoria_id   UUID, -- preenchido quando realizada
  status         status_agendamento NOT NULL DEFAULT 'pendente',
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- AUDITORIAS ----
CREATE TABLE auditorias (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id            UUID NOT NULL REFERENCES veiculos(id) ON DELETE RESTRICT,
  motorista_id          UUID REFERENCES motoristas(id) ON DELETE SET NULL,
  template_version_id   UUID NOT NULL REFERENCES checklist_template_versions(id),
  status                status_auditoria NOT NULL DEFAULT 'em_andamento',
  km                    INTEGER,
  observacoes_gerais    TEXT,
  responsavel_id        UUID NOT NULL REFERENCES auth.users(id),
  data_inicio           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_conclusao        TIMESTAMPTZ,
  agendamento_id        UUID REFERENCES auditoria_agendamentos(id) ON DELETE SET NULL,
  latitude              DECIMAL(10, 8),
  longitude             DECIMAL(11, 8),
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- FK circular: agendamento → auditoria ----
ALTER TABLE auditoria_agendamentos
  ADD CONSTRAINT fk_agendamento_auditoria
  FOREIGN KEY (auditoria_id) REFERENCES auditorias(id)
  ON DELETE SET NULL;

-- ---- RESPOSTAS DE AUDITORIA ----
-- Não repete tudo de novo. Registra apenas o que foi verificado.
CREATE TABLE auditoria_respostas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auditoria_id     UUID NOT NULL REFERENCES auditorias(id) ON DELETE CASCADE,
  item_id          UUID NOT NULL REFERENCES checklist_items(id),
  -- Continua igual ao último estado registrado?
  continua_igual   BOOLEAN,
  -- Novo status apenas se mudou
  resposta_nova    resposta_item,
  observacao       TEXT,
  gera_ocorrencia  BOOLEAN NOT NULL DEFAULT FALSE,
  ocorrencia_id    UUID, -- FK adicionada após ocorrencias
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(auditoria_id, item_id)
);

-- ---- FKs retroativas (adicionar à fotos) ----
ALTER TABLE checklist_fotos
  ADD CONSTRAINT fk_fotos_auditoria
  FOREIGN KEY (auditoria_id) REFERENCES auditorias(id)
  ON DELETE SET NULL;

-- ---- FKs retroativas no estado atual ----
ALTER TABLE veiculo_estado_atual
  ADD CONSTRAINT fk_estado_auditoria
  FOREIGN KEY (atualizado_por_auditoria_id) REFERENCES auditorias(id)
  ON DELETE SET NULL;

ALTER TABLE veiculo_estado_historico
  ADD CONSTRAINT fk_historico_auditoria
  FOREIGN KEY (auditoria_id) REFERENCES auditorias(id)
  ON DELETE SET NULL;

-- ---- ÍNDICES ----
CREATE INDEX auditorias_veiculo_idx ON auditorias(veiculo_id);
CREATE INDEX auditorias_status_idx ON auditorias(status);
CREATE INDEX auditorias_data_conclusao_idx ON auditorias(data_conclusao DESC NULLS LAST);
CREATE INDEX auditoria_agendamentos_veiculo_idx ON auditoria_agendamentos(veiculo_id);
CREATE INDEX auditoria_agendamentos_status_idx ON auditoria_agendamentos(status);
CREATE INDEX auditoria_agendamentos_data_idx ON auditoria_agendamentos(data_agendada);

-- Trigger
CREATE TRIGGER set_updated_at_auditorias
  BEFORE UPDATE ON auditorias
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_auditoria_respostas
  BEFORE UPDATE ON auditoria_respostas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
