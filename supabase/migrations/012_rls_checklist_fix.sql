-- ============================================================
-- MIGRATION 012 — AJUSTES DE RLS PARA O FLUXO DE CHECKLIST BASE
-- Complementa a 009_rls_policies.sql para a finalização completa
-- do checklist da Etapa 4.
-- ============================================================

-- Arquivo seguro para reexecução em ambiente de desenvolvimento.
DROP POLICY IF EXISTS "checklist_respostas_update" ON checklist_respostas;
DROP POLICY IF EXISTS "auditoria_agendamentos_insert" ON auditoria_agendamentos;
DROP POLICY IF EXISTS "auditoria_agendamentos_update" ON auditoria_agendamentos;

-- Permite atualizar checklist_respostas para vincular ocorrencia_id
-- após a ocorrência ser criada automaticamente.
CREATE POLICY "checklist_respostas_update" ON checklist_respostas
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM checklists c
      WHERE c.id = checklist_id
      AND (c.responsavel_id = auth.uid() OR is_admin_or_frota())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM checklists c
      WHERE c.id = checklist_id
      AND (c.responsavel_id = auth.uid() OR is_admin_or_frota())
    )
  );

-- Permite criar agendamentos de auditoria automaticamente
-- ao finalizar um checklist base ou uma auditoria.
CREATE POLICY "auditoria_agendamentos_insert" ON auditoria_agendamentos
  FOR INSERT TO authenticated
  WITH CHECK (get_user_perfil() IN ('admin', 'frota', 'motorista'));

-- Permite atualizar agendamentos quando o fluxo da auditoria evoluir.
CREATE POLICY "auditoria_agendamentos_update" ON auditoria_agendamentos
  FOR UPDATE TO authenticated
  USING (get_user_perfil() IN ('admin', 'frota', 'motorista'))
  WITH CHECK (get_user_perfil() IN ('admin', 'frota', 'motorista'));
