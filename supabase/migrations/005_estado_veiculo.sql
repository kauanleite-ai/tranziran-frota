-- ============================================================
-- MIGRATION 005 — ESTADO ATUAL E HISTÓRICO DO VEÍCULO
-- O coração do sistema: registra o estado real de cada item
-- ============================================================

-- ---- ESTADO ATUAL ----
-- Uma linha por veículo + item. Sempre reflete o estado mais recente.
-- NUNCA deletar linhas. Atualizar em conjunto com o histórico.
CREATE TABLE veiculo_estado_atual (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id                      UUID NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  item_id                         UUID NOT NULL REFERENCES checklist_items(id),
  resposta                        resposta_item NOT NULL,
  observacao                      TEXT,
  ultima_foto_path                TEXT,
  atualizado_por_checklist_id     UUID REFERENCES checklists(id) ON DELETE SET NULL,
  atualizado_por_auditoria_id     UUID, -- FK adicionada após auditorias
  data_atualizacao                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quem_atualizou                  UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(veiculo_id, item_id)
);

-- ---- HISTÓRICO COMPLETO ----
-- Nunca apagar. Imutável. Audit trail completo.
CREATE TABLE veiculo_estado_historico (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id            UUID NOT NULL REFERENCES veiculos(id) ON DELETE RESTRICT,
  item_id               UUID NOT NULL REFERENCES checklist_items(id),
  resposta_anterior     resposta_item,
  resposta_nova         resposta_item NOT NULL,
  observacao_anterior   TEXT,
  observacao_nova       TEXT,
  foto_anterior_path    TEXT,
  foto_nova_path        TEXT,
  origem                origem_estado NOT NULL,
  checklist_id          UUID REFERENCES checklists(id) ON DELETE SET NULL,
  auditoria_id          UUID, -- FK adicionada após auditorias
  ocorrencia_id         UUID, -- FK adicionada após ocorrencias
  quem_alterou          UUID NOT NULL REFERENCES auth.users(id),
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NUNCA adicionar updated_at aqui. Registros são imutáveis.
);

-- ---- ÍNDICES ----
CREATE INDEX veiculo_estado_atual_veiculo_idx ON veiculo_estado_atual(veiculo_id);
CREATE INDEX veiculo_estado_atual_item_idx ON veiculo_estado_atual(item_id);
CREATE INDEX veiculo_estado_atual_nao_ok_idx ON veiculo_estado_atual(resposta) WHERE resposta = 'nao_ok';

CREATE INDEX veiculo_estado_historico_veiculo_idx ON veiculo_estado_historico(veiculo_id);
CREATE INDEX veiculo_estado_historico_item_idx ON veiculo_estado_historico(item_id);
CREATE INDEX veiculo_estado_historico_criado_idx ON veiculo_estado_historico(criado_em DESC);
CREATE INDEX veiculo_estado_historico_checklist_idx ON veiculo_estado_historico(checklist_id);
CREATE INDEX veiculo_estado_historico_auditoria_idx ON veiculo_estado_historico(auditoria_id);
