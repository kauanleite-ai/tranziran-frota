-- ============================================================
-- MIGRATION 013 — STATUS OPERACIONAL E TRATATIVA DE MANUTENÇÃO
-- ============================================================
-- Objetivo:
-- - Transformar não conformidade em status operacional do veículo.
-- - Bloquear novo checklist comum enquanto houver ocorrência bloqueante aberta.
-- - Preparar comunicação com manutenção por e-mail com link de devolutiva.
-- - Medir tempo total da pendência e tempo em oficina.

-- ---- VEÍCULOS: status operacional independente do status cadastral ----
ALTER TABLE veiculos
  ADD COLUMN IF NOT EXISTS status_operacional TEXT NOT NULL DEFAULT 'liberado',
  ADD COLUMN IF NOT EXISTS bloqueado_checklist BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ocorrencia_bloqueante_id UUID,
  ADD COLUMN IF NOT EXISTS bloqueio_motivo TEXT,
  ADD COLUMN IF NOT EXISTS data_bloqueio TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_liberacao_operacional TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'veiculos_ocorrencia_bloqueante_fk'
  ) THEN
    ALTER TABLE veiculos
      ADD CONSTRAINT veiculos_ocorrencia_bloqueante_fk
      FOREIGN KEY (ocorrencia_bloqueante_id) REFERENCES ocorrencias(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'veiculos_status_operacional_check'
  ) THEN
    ALTER TABLE veiculos
      ADD CONSTRAINT veiculos_status_operacional_check
      CHECK (status_operacional IN (
        'liberado',
        'nao_conformidade_aberta',
        'encaminhado_manutencao',
        'aguardando_devolutiva_manutencao',
        'aguardando_envio_oficina',
        'em_oficina',
        'resolvido_aguardando_validacao'
      ));
  END IF;
END $$;

-- ---- OCORRÊNCIAS: status de tratativa + datas gerenciais ----
ALTER TABLE ocorrencias
  ADD COLUMN IF NOT EXISTS bloqueante BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS status_tratativa TEXT NOT NULL DEFAULT 'nao_conformidade_aberta',
  ADD COLUMN IF NOT EXISTS email_enviado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_destinatarios TEXT[],
  ADD COLUMN IF NOT EXISTS email_status TEXT NOT NULL DEFAULT 'nao_enviado',
  ADD COLUMN IF NOT EXISTS email_erro TEXT,
  ADD COLUMN IF NOT EXISTS protocolo_email TEXT,
  ADD COLUMN IF NOT EXISTS data_encaminhado_manutencao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_devolutiva_manutencao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_solicitado_oficina TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_entrada_oficina TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_saida_oficina TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_validacao_frota TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dias_em_oficina NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS dias_pendencia_total NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS devolutiva_manutencao TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ocorrencias_status_tratativa_check'
  ) THEN
    ALTER TABLE ocorrencias
      ADD CONSTRAINT ocorrencias_status_tratativa_check
      CHECK (status_tratativa IN (
        'nao_conformidade_aberta',
        'encaminhado_manutencao',
        'aguardando_devolutiva_manutencao',
        'em_analise_manutencao',
        'aguardando_envio_oficina',
        'em_oficina',
        'resolvido_aguardando_validacao',
        'validada_liberada',
        'cancelada'
      ));
  END IF;
END $$;

-- ---- ACESSO PÚBLICO CONTROLADO PARA MANUTENÇÃO ----
CREATE TABLE IF NOT EXISTS ocorrencia_acessos_manutencao (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrencia_id  UUID NOT NULL REFERENCES ocorrencias(id) ON DELETE CASCADE,
  token          TEXT NOT NULL UNIQUE,
  ativo          BOOLEAN NOT NULL DEFAULT TRUE,
  expira_em      TIMESTAMPTZ,
  usado_em       TIMESTAMPTZ,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- LOG DE E-MAILS ENVIADOS/PREPARADOS ----
CREATE TABLE IF NOT EXISTS ocorrencia_email_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrencia_id   UUID NOT NULL REFERENCES ocorrencias(id) ON DELETE CASCADE,
  destinatarios   TEXT[] NOT NULL DEFAULT '{}',
  assunto         TEXT NOT NULL,
  corpo_html      TEXT,
  status          TEXT NOT NULL DEFAULT 'pendente_configuracao',
  provider        TEXT,
  provider_id     TEXT,
  erro            TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- ÍNDICES ----
CREATE INDEX IF NOT EXISTS veiculos_status_operacional_idx ON veiculos(status_operacional);
CREATE INDEX IF NOT EXISTS veiculos_bloqueado_checklist_idx ON veiculos(bloqueado_checklist);
CREATE INDEX IF NOT EXISTS ocorrencias_bloqueante_idx ON ocorrencias(bloqueante);
CREATE INDEX IF NOT EXISTS ocorrencias_status_tratativa_idx ON ocorrencias(status_tratativa);
CREATE INDEX IF NOT EXISTS ocorrencia_acessos_token_idx ON ocorrencia_acessos_manutencao(token);

-- ---- RLS das novas tabelas ----
ALTER TABLE ocorrencia_acessos_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocorrencia_email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_ocorrencia_acessos_manutencao" ON ocorrencia_acessos_manutencao;
DROP POLICY IF EXISTS "manage_ocorrencia_acessos_manutencao" ON ocorrencia_acessos_manutencao;
DROP POLICY IF EXISTS "select_ocorrencia_email_logs" ON ocorrencia_email_logs;
DROP POLICY IF EXISTS "manage_ocorrencia_email_logs" ON ocorrencia_email_logs;

CREATE POLICY "select_ocorrencia_acessos_manutencao" ON ocorrencia_acessos_manutencao
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "manage_ocorrencia_acessos_manutencao" ON ocorrencia_acessos_manutencao
  FOR ALL TO authenticated
  USING (is_admin_or_frota() OR get_user_perfil() = 'manutencao')
  WITH CHECK (is_admin_or_frota() OR get_user_perfil() = 'manutencao');

CREATE POLICY "select_ocorrencia_email_logs" ON ocorrencia_email_logs
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "manage_ocorrencia_email_logs" ON ocorrencia_email_logs
  FOR ALL TO authenticated
  USING (is_admin_or_frota() OR get_user_perfil() = 'manutencao')
  WITH CHECK (is_admin_or_frota() OR get_user_perfil() = 'manutencao');

-- ---- Sincroniza ocorrências abertas existentes como bloqueantes/status novo ----
UPDATE ocorrencias
SET bloqueante = TRUE,
    status_tratativa = CASE
      WHEN status = 'resolvida' THEN 'validada_liberada'
      WHEN status = 'cancelada' THEN 'cancelada'
      WHEN status = 'aguardando_manutencao' THEN 'encaminhado_manutencao'
      WHEN status = 'em_analise' THEN 'em_analise_manutencao'
      ELSE status_tratativa
    END
WHERE status_tratativa = 'nao_conformidade_aberta';

UPDATE veiculos v
SET status_operacional = 'nao_conformidade_aberta',
    bloqueado_checklist = TRUE,
    ocorrencia_bloqueante_id = o.id,
    bloqueio_motivo = CONCAT('Ocorrência #', o.numero, ' aberta: ', o.descricao),
    data_bloqueio = COALESCE(v.data_bloqueio, o.criado_em)
FROM ocorrencias o
WHERE o.veiculo_id = v.id
  AND o.bloqueante = TRUE
  AND o.status NOT IN ('resolvida', 'cancelada')
  AND v.bloqueado_checklist = FALSE;
