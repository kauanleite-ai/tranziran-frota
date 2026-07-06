-- ============================================================
-- 014_fotos_auditoria_resposta.sql
-- Corrige vínculo de fotos com respostas de auditoria.
-- Antes, checklist_fotos.resposta_id apontava apenas para checklist_respostas.
-- Para auditorias, é necessário um campo próprio apontando para auditoria_respostas.
-- ============================================================

ALTER TABLE checklist_fotos
  ADD COLUMN IF NOT EXISTS auditoria_resposta_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_fotos_auditoria_resposta'
  ) THEN
    ALTER TABLE checklist_fotos
      ADD CONSTRAINT fk_fotos_auditoria_resposta
      FOREIGN KEY (auditoria_resposta_id)
      REFERENCES auditoria_respostas(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS checklist_fotos_auditoria_resposta_idx
  ON checklist_fotos(auditoria_resposta_id);

-- Backfill seguro para registros que já estejam vinculados por auditoria/ocorrência.
UPDATE checklist_fotos f
SET auditoria_resposta_id = ar.id
FROM auditoria_respostas ar
WHERE f.auditoria_resposta_id IS NULL
  AND f.auditoria_id = ar.auditoria_id
  AND f.ocorrencia_id IS NOT NULL
  AND ar.ocorrencia_id = f.ocorrencia_id;
