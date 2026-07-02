-- ============================================================
-- MIGRATION 002 — CADASTROS PRINCIPAIS
-- Empresas, Unidades, Usuários, Motoristas, Veículos
-- ============================================================

-- ---- EMPRESAS ----
CREATE TABLE empresas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  cnpj        TEXT UNIQUE,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- UNIDADES ----
CREATE TABLE unidades (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  nome        TEXT NOT NULL,
  cidade      TEXT,
  estado      CHAR(2),
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- PERFIS DE USUÁRIO ----
-- Extende o auth.users do Supabase com dados específicos do sistema
CREATE TABLE usuarios_perfis (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL,
  perfil      perfil_usuario NOT NULL DEFAULT 'motorista',
  empresa_id  UUID REFERENCES empresas(id) ON DELETE SET NULL,
  unidade_id  UUID REFERENCES unidades(id) ON DELETE SET NULL,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- MOTORISTAS ----
CREATE TABLE motoristas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  matricula       TEXT NOT NULL,
  cpf             TEXT UNIQUE,
  telefone        TEXT,
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  unidade_id      UUID REFERENCES unidades(id) ON DELETE SET NULL,
  cnh             TEXT,
  cnh_validade    DATE,
  mopp            BOOLEAN NOT NULL DEFAULT FALSE,
  mopp_validade   DATE,
  status          status_motorista NOT NULL DEFAULT 'ativo',
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Matrícula única por empresa
CREATE UNIQUE INDEX motoristas_matricula_empresa_idx ON motoristas(matricula, empresa_id);

-- ---- VEÍCULOS ----
CREATE TABLE veiculos (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa                      TEXT NOT NULL UNIQUE,
  codigo_frota               TEXT,
  empresa_id                 UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  unidade_id                 UUID REFERENCES unidades(id) ON DELETE SET NULL,
  tipo                       tipo_veiculo NOT NULL,
  fabricante                 TEXT,
  modelo                     TEXT,
  ano                        SMALLINT,
  status                     status_veiculo NOT NULL DEFAULT 'ativo',
  km_atual                   INTEGER,
  -- Preparado para telemetria futura — não obrigatório
  telemetria_id              TEXT,
  telemetria_provider        TEXT,
  -- Controle de checklist base
  checklist_base_concluido   BOOLEAN NOT NULL DEFAULT FALSE,
  data_checklist_base        TIMESTAMPTZ,
  data_proxima_auditoria     DATE,
  criado_em                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- VÍNCULO VEÍCULO-MOTORISTA ----
-- Histórico de motoristas vinculados ao veículo
CREATE TABLE veiculo_motorista_vinculos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id    UUID NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  motorista_id  UUID NOT NULL REFERENCES motoristas(id) ON DELETE CASCADE,
  data_inicio   DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim      DATE,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantir que um veículo tenha apenas um motorista ativo por vez
CREATE UNIQUE INDEX veiculo_motorista_ativo_idx
  ON veiculo_motorista_vinculos(veiculo_id)
  WHERE ativo = TRUE;

-- ---- TRIGGERS DE updated_at ----
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_empresas
  BEFORE UPDATE ON empresas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_unidades
  BEFORE UPDATE ON unidades
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_usuarios_perfis
  BEFORE UPDATE ON usuarios_perfis
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_motoristas
  BEFORE UPDATE ON motoristas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_veiculos
  BEFORE UPDATE ON veiculos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();



-- ---- TRIGGER: criar perfil automaticamente após signup ----
-- Mantém o cadastro interno sincronizado com auth.users.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usuarios_perfis (user_id, nome, email, perfil)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'perfil')::perfil_usuario, 'motorista')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---- ÍNDICES ----
CREATE INDEX veiculos_empresa_idx ON veiculos(empresa_id);
CREATE INDEX veiculos_status_idx ON veiculos(status);
CREATE INDEX veiculos_proxima_auditoria_idx ON veiculos(data_proxima_auditoria);
CREATE INDEX motoristas_empresa_idx ON motoristas(empresa_id);
CREATE INDEX motoristas_status_idx ON motoristas(status);
