-- ============================================================
-- MIGRATION 008 — TELEMETRIA (PREPARADA PARA USO FUTURO)
-- NÃO IMPLEMENTAR INTEGRAÇÃO AINDA.
-- Apenas estrutura de banco pronta para receber dados de API.
-- ============================================================

-- ---- INTEGRAÇÕES ----
CREATE TABLE integracoes_telemetria (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  provider   TEXT NOT NULL, -- ex: 'Rastremais', 'Sascar', 'Onixsat'
  api_url    TEXT,
  api_key    TEXT, -- armazenar criptografado em produção
  ativo      BOOLEAN NOT NULL DEFAULT FALSE, -- desativado por padrão
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- VÍNCULO VEÍCULO-TELEMETRIA ----
CREATE TABLE telemetria_veiculos (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id              UUID NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  integracao_id           UUID NOT NULL REFERENCES integracoes_telemetria(id),
  telemetria_external_id  TEXT NOT NULL, -- ID do veículo na plataforma de telemetria
  ativo                   BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(veiculo_id, integracao_id)
);

-- ---- ODÔMETRO (via telemetria) ----
CREATE TABLE telemetria_odometro (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id   UUID NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  km           INTEGER NOT NULL,
  fonte        TEXT NOT NULL DEFAULT 'telemetria',
  capturado_em TIMESTAMPTZ NOT NULL,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- EVENTOS DE TELEMETRIA ----
CREATE TABLE telemetria_eventos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id   UUID NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  tipo_evento  TEXT NOT NULL, -- ex: 'excesso_velocidade', 'frenagem_brusca'
  latitude     DECIMAL(10, 8),
  longitude    DECIMAL(11, 8),
  valor        TEXT,
  capturado_em TIMESTAMPTZ NOT NULL,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- SYNC LOG ----
CREATE TABLE telemetria_sync_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integracao_id UUID NOT NULL REFERENCES integracoes_telemetria(id),
  status        TEXT NOT NULL, -- 'sucesso', 'erro', 'parcial'
  registros     INTEGER DEFAULT 0,
  erro_mensagem TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- ÍNDICES ----
CREATE INDEX telemetria_odometro_veiculo_idx ON telemetria_odometro(veiculo_id, capturado_em DESC);
CREATE INDEX telemetria_eventos_veiculo_idx ON telemetria_eventos(veiculo_id, capturado_em DESC);

-- COMENTÁRIO: Não criar jobs, crons ou webhooks ainda.
-- A integração real será implementada na Etapa 8.
