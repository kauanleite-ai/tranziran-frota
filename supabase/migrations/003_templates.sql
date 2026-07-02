-- ============================================================
-- MIGRATION 003 — TEMPLATES DE CHECKLIST
-- Estrutura dinâmica: Template > Versão > Categoria > Item > Regra
-- ============================================================

-- ---- TEMPLATES ----
CREATE TABLE checklist_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             TEXT NOT NULL,
  descricao        TEXT,
  versao_atual_id  UUID, -- FK adicionada após criar versions
  ativo            BOOLEAN NOT NULL DEFAULT TRUE,
  criado_por       UUID REFERENCES auth.users(id), -- nulo permitido para seeds do sistema
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- VERSÕES DOS TEMPLATES ----
-- Permite evoluir o template sem perder histórico de checklists passados
CREATE TABLE checklist_template_versions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  versao       SMALLINT NOT NULL DEFAULT 1,
  publicado    BOOLEAN NOT NULL DEFAULT FALSE,
  publicado_em TIMESTAMPTZ,
  criado_por   UUID REFERENCES auth.users(id), -- nulo permitido para seeds do sistema
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, versao)
);

-- Adicionar FK circular após criação das duas tabelas
ALTER TABLE checklist_templates
  ADD CONSTRAINT fk_versao_atual
  FOREIGN KEY (versao_atual_id) REFERENCES checklist_template_versions(id)
  ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ---- CATEGORIAS ----
CREATE TABLE checklist_categorias (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_version_id   UUID NOT NULL REFERENCES checklist_template_versions(id) ON DELETE CASCADE,
  nome                  TEXT NOT NULL,
  descricao             TEXT,
  ordem                 SMALLINT NOT NULL DEFAULT 0,
  ativo                 BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- ITENS ----
CREATE TABLE checklist_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id          UUID NOT NULL REFERENCES checklist_categorias(id) ON DELETE CASCADE,
  nome                  TEXT NOT NULL,
  descricao             TEXT,
  tipo_resposta         tipo_resposta_item NOT NULL DEFAULT 'status_padrao',
  exige_foto            BOOLEAN NOT NULL DEFAULT FALSE,
  exige_obs_se_nao_ok   BOOLEAN NOT NULL DEFAULT TRUE,
  item_critico          BOOLEAN NOT NULL DEFAULT FALSE,
  -- Aplicabilidade por tipo de veículo
  aplica_cavalo         BOOLEAN NOT NULL DEFAULT TRUE,
  aplica_carreta        BOOLEAN NOT NULL DEFAULT TRUE,
  aplica_bau            BOOLEAN NOT NULL DEFAULT TRUE,
  aplica_truck          BOOLEAN NOT NULL DEFAULT TRUE,
  aplica_carro_passeio  BOOLEAN NOT NULL DEFAULT FALSE,
  aplica_guindaste      BOOLEAN NOT NULL DEFAULT FALSE,
  ordem                 SMALLINT NOT NULL DEFAULT 0,
  ativo                 BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- REGRAS ADICIONAIS DE ITEM ----
-- Para regras específicas como: "exige foto se resposta for nao_ok"
CREATE TABLE checklist_item_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  regra       TEXT NOT NULL, -- ex: 'exige_foto_se_nao_ok', 'bloqueia_liberacao'
  valor       TEXT,          -- valor da regra quando necessário
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- ÍNDICES ----
CREATE INDEX checklist_categorias_version_idx ON checklist_categorias(template_version_id, ordem);
CREATE INDEX checklist_items_categoria_idx ON checklist_items(categoria_id, ordem);
CREATE INDEX checklist_items_critico_idx ON checklist_items(item_critico) WHERE item_critico = TRUE;
CREATE UNIQUE INDEX checklist_item_rules_item_regra_idx ON checklist_item_rules(item_id, regra);

-- Trigger de updated_at para templates
CREATE TRIGGER set_updated_at_templates
  BEFORE UPDATE ON checklist_templates
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
