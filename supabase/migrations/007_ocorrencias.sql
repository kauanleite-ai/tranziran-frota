-- ============================================================
-- MIGRATION 007 — OCORRÊNCIAS
-- ============================================================

-- ---- OCORRÊNCIAS ----
CREATE TABLE ocorrencias (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Número sequencial amigável (gerado por sequence)
  numero           BIGSERIAL,
  veiculo_id       UUID NOT NULL REFERENCES veiculos(id) ON DELETE RESTRICT,
  checklist_id     UUID REFERENCES checklists(id) ON DELETE SET NULL,
  auditoria_id     UUID REFERENCES auditorias(id) ON DELETE SET NULL,
  item_id          UUID NOT NULL REFERENCES checklist_items(id),
  descricao        TEXT NOT NULL,
  gravidade        gravidade_ocorrencia NOT NULL DEFAULT 'media',
  responsavel      responsavel_ocorrencia NOT NULL DEFAULT 'frota',
  prazo            DATE,
  status           status_ocorrencia NOT NULL DEFAULT 'aberta',
  aberta_por       UUID NOT NULL REFERENCES auth.users(id),
  resolvida_por    UUID REFERENCES auth.users(id),
  data_resolucao   TIMESTAMPTZ,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- HISTÓRICO DE MOVIMENTAÇÃO ----
-- Imutável: registra cada mudança de status
CREATE TABLE ocorrencia_historico (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrencia_id    UUID NOT NULL REFERENCES ocorrencias(id) ON DELETE CASCADE,
  status_anterior  status_ocorrencia,
  status_novo      status_ocorrencia NOT NULL,
  observacao       TEXT,
  feito_por        UUID NOT NULL REFERENCES auth.users(id),
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- FKs retroativas ----

-- Respostas de checklist podem gerar ocorrências
ALTER TABLE checklist_respostas
  ADD CONSTRAINT fk_resposta_ocorrencia
  FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencias(id)
  ON DELETE SET NULL;

-- Respostas de auditoria podem gerar ocorrências
ALTER TABLE auditoria_respostas
  ADD CONSTRAINT fk_auditoria_resposta_ocorrencia
  FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencias(id)
  ON DELETE SET NULL;

-- Fotos podem pertencer a ocorrência
ALTER TABLE checklist_fotos
  ADD CONSTRAINT fk_fotos_ocorrencia
  FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencias(id)
  ON DELETE SET NULL;

-- Histórico de estado pode referenciar ocorrência
ALTER TABLE veiculo_estado_historico
  ADD CONSTRAINT fk_historico_ocorrencia
  FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencias(id)
  ON DELETE SET NULL;

-- ---- TRIGGER: ao resolver ocorrência, registrar histórico automaticamente ----
CREATE OR REPLACE FUNCTION trigger_ocorrencia_historico()
RETURNS TRIGGER AS $$
BEGIN
  -- Registra histórico quando status muda
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO ocorrencia_historico (
      ocorrencia_id,
      status_anterior,
      status_novo,
      feito_por
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(NEW.resolvida_por, auth.uid(), OLD.aberta_por)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_historico_ocorrencia
  AFTER UPDATE ON ocorrencias
  FOR EACH ROW EXECUTE FUNCTION trigger_ocorrencia_historico();

-- ---- ÍNDICES ----
CREATE INDEX ocorrencias_veiculo_idx ON ocorrencias(veiculo_id);
CREATE INDEX ocorrencias_status_idx ON ocorrencias(status);
CREATE INDEX ocorrencias_gravidade_idx ON ocorrencias(gravidade);
CREATE INDEX ocorrencias_criado_idx ON ocorrencias(criado_em DESC);
CREATE INDEX ocorrencias_abertas_idx ON ocorrencias(status)
  WHERE status IN ('aberta', 'em_analise', 'aguardando_manutencao');

CREATE TRIGGER set_updated_at_ocorrencias
  BEFORE UPDATE ON ocorrencias
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
