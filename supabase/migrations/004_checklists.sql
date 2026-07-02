-- ============================================================
-- MIGRATION 004 — CHECKLISTS, RESPOSTAS E FOTOS
-- ============================================================

-- ---- CHECKLISTS ----
CREATE TABLE checklists (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id            UUID NOT NULL REFERENCES veiculos(id) ON DELETE RESTRICT,
  motorista_id          UUID REFERENCES motoristas(id) ON DELETE SET NULL,
  template_version_id   UUID NOT NULL REFERENCES checklist_template_versions(id),
  tipo                  tipo_checklist NOT NULL,
  status                status_checklist NOT NULL DEFAULT 'em_andamento',
  km                    INTEGER,
  observacoes_gerais    TEXT,
  responsavel_id        UUID NOT NULL REFERENCES auth.users(id),
  data_inicio           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_conclusao        TIMESTAMPTZ,
  -- Geolocalização opcional
  latitude              DECIMAL(10, 8),
  longitude             DECIMAL(11, 8),
  -- Rastreabilidade
  ip_dispositivo        TEXT,
  user_agent            TEXT,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- RESPOSTAS ----
CREATE TABLE checklist_respostas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id     UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  item_id          UUID NOT NULL REFERENCES checklist_items(id),
  resposta         resposta_item,
  observacao       TEXT,
  gera_ocorrencia  BOOLEAN NOT NULL DEFAULT FALSE,
  ocorrencia_id    UUID, -- FK adicionada após criar ocorrencias
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(checklist_id, item_id)
);

-- ---- FOTOS ----
-- Referência única de fotos — caminho no Supabase Storage
-- NUNCA salvar base64 aqui
CREATE TABLE checklist_fotos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Relacionamento polimórfico: foto pode pertencer a checklist, auditoria ou ocorrência
  checklist_id   UUID REFERENCES checklists(id) ON DELETE CASCADE,
  resposta_id    UUID REFERENCES checklist_respostas(id) ON DELETE SET NULL,
  auditoria_id   UUID, -- FK adicionada após criar auditorias
  ocorrencia_id  UUID, -- FK adicionada após criar ocorrencias
  -- Storage
  storage_path   TEXT NOT NULL,  -- ex: fotos/checklists/uuid/foto.jpg
  nome_original  TEXT NOT NULL,
  tamanho_bytes  INTEGER,
  mime_type      TEXT,
  descricao      TEXT,
  enviado_por    UUID NOT NULL REFERENCES auth.users(id),
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- ASSINATURAS ----
CREATE TABLE checklist_assinaturas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id  UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL, -- 'motorista', 'responsavel', 'testemunha'
  nome          TEXT NOT NULL,
  storage_path  TEXT, -- imagem da assinatura no storage
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- ÍNDICES ----
CREATE INDEX checklists_veiculo_idx ON checklists(veiculo_id);
CREATE INDEX checklists_status_idx ON checklists(status);
CREATE INDEX checklists_tipo_idx ON checklists(tipo);
CREATE INDEX checklists_data_conclusao_idx ON checklists(data_conclusao DESC NULLS LAST);
CREATE INDEX checklist_respostas_checklist_idx ON checklist_respostas(checklist_id);
CREATE INDEX checklist_respostas_item_idx ON checklist_respostas(item_id);
CREATE INDEX checklist_respostas_nao_ok_idx ON checklist_respostas(resposta) WHERE resposta = 'nao_ok';
CREATE INDEX checklist_fotos_checklist_idx ON checklist_fotos(checklist_id);

-- Triggers
CREATE TRIGGER set_updated_at_checklists
  BEFORE UPDATE ON checklists
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_checklist_respostas
  BEFORE UPDATE ON checklist_respostas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
