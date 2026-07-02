-- ============================================================
-- MIGRATION 009 — ROW LEVEL SECURITY (RLS)
-- Segurança por perfil de usuário.
-- Regra geral: leitura para autenticados; escrita por perfil.
-- ============================================================

-- ---- HABILITAR RLS EM TODAS AS TABELAS DO SISTEMA ----
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE veiculo_motorista_vinculos ENABLE ROW LEVEL SECURITY;

ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_item_rules ENABLE ROW LEVEL SECURITY;

ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_assinaturas ENABLE ROW LEVEL SECURITY;

ALTER TABLE veiculo_estado_atual ENABLE ROW LEVEL SECURITY;
ALTER TABLE veiculo_estado_historico ENABLE ROW LEVEL SECURITY;

ALTER TABLE auditoria_agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_respostas ENABLE ROW LEVEL SECURITY;

ALTER TABLE ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocorrencia_historico ENABLE ROW LEVEL SECURITY;

ALTER TABLE integracoes_telemetria ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetria_veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetria_odometro ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetria_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetria_sync_logs ENABLE ROW LEVEL SECURITY;

-- ---- FUNÇÕES AUXILIARES ----
CREATE OR REPLACE FUNCTION get_user_perfil()
RETURNS perfil_usuario AS $$
  SELECT perfil FROM usuarios_perfis WHERE user_id = auth.uid() AND ativo = TRUE LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS UUID AS $$
  SELECT empresa_id FROM usuarios_perfis WHERE user_id = auth.uid() AND ativo = TRUE LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_admin_or_frota()
RETURNS BOOLEAN AS $$
  SELECT get_user_perfil() IN ('admin', 'frota');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================
-- LEITURA — usuários autenticados podem consultar dados internos.
-- ============================================================

CREATE POLICY "select_empresas" ON empresas FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select_unidades" ON unidades FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select_usuarios_perfis" ON usuarios_perfis FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select_motoristas" ON motoristas FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select_veiculos" ON veiculos FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select_veiculo_motorista_vinculos" ON veiculo_motorista_vinculos FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "select_checklist_templates" ON checklist_templates FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select_checklist_template_versions" ON checklist_template_versions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select_checklist_categorias" ON checklist_categorias FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select_checklist_items" ON checklist_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select_checklist_item_rules" ON checklist_item_rules FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "select_checklists" ON checklists FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select_checklist_respostas" ON checklist_respostas FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select_checklist_fotos" ON checklist_fotos FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select_checklist_assinaturas" ON checklist_assinaturas FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "select_veiculo_estado_atual" ON veiculo_estado_atual FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select_veiculo_estado_historico" ON veiculo_estado_historico FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "select_auditoria_agendamentos" ON auditoria_agendamentos FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select_auditorias" ON auditorias FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select_auditoria_respostas" ON auditoria_respostas FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "select_ocorrencias" ON ocorrencias FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select_ocorrencia_historico" ON ocorrencia_historico FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "select_integracoes_telemetria" ON integracoes_telemetria FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select_telemetria_veiculos" ON telemetria_veiculos FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select_telemetria_odometro" ON telemetria_odometro FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select_telemetria_eventos" ON telemetria_eventos FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select_telemetria_sync_logs" ON telemetria_sync_logs FOR SELECT TO authenticated USING (TRUE);

-- ============================================================
-- CADASTROS — admin/frota gerenciam operação; admin gerencia estrutura.
-- ============================================================

CREATE POLICY "admin_manage_empresas" ON empresas
  FOR ALL TO authenticated
  USING (get_user_perfil() = 'admin')
  WITH CHECK (get_user_perfil() = 'admin');

CREATE POLICY "admin_manage_unidades" ON unidades
  FOR ALL TO authenticated
  USING (get_user_perfil() = 'admin')
  WITH CHECK (get_user_perfil() = 'admin');

CREATE POLICY "admin_manage_usuarios_perfis" ON usuarios_perfis
  FOR ALL TO authenticated
  USING (get_user_perfil() = 'admin')
  WITH CHECK (get_user_perfil() = 'admin');

CREATE POLICY "self_update_usuarios_perfis" ON usuarios_perfis
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "frota_manage_motoristas" ON motoristas
  FOR ALL TO authenticated
  USING (is_admin_or_frota())
  WITH CHECK (is_admin_or_frota());

CREATE POLICY "frota_manage_veiculos" ON veiculos
  FOR ALL TO authenticated
  USING (is_admin_or_frota())
  WITH CHECK (is_admin_or_frota());

CREATE POLICY "frota_manage_veiculo_motorista_vinculos" ON veiculo_motorista_vinculos
  FOR ALL TO authenticated
  USING (is_admin_or_frota())
  WITH CHECK (is_admin_or_frota());

-- ============================================================
-- TEMPLATES — somente admin/frota alteram. Todos consultam.
-- ============================================================

CREATE POLICY "frota_manage_checklist_templates" ON checklist_templates
  FOR ALL TO authenticated
  USING (is_admin_or_frota())
  WITH CHECK (is_admin_or_frota());

CREATE POLICY "frota_manage_checklist_template_versions" ON checklist_template_versions
  FOR ALL TO authenticated
  USING (is_admin_or_frota())
  WITH CHECK (is_admin_or_frota());

CREATE POLICY "frota_manage_checklist_categorias" ON checklist_categorias
  FOR ALL TO authenticated
  USING (is_admin_or_frota())
  WITH CHECK (is_admin_or_frota());

CREATE POLICY "frota_manage_checklist_items" ON checklist_items
  FOR ALL TO authenticated
  USING (is_admin_or_frota())
  WITH CHECK (is_admin_or_frota());

CREATE POLICY "frota_manage_checklist_item_rules" ON checklist_item_rules
  FOR ALL TO authenticated
  USING (is_admin_or_frota())
  WITH CHECK (is_admin_or_frota());

-- ============================================================
-- CHECKLISTS — motorista cria/preenche; frota/admin corrigem.
-- ============================================================

CREATE POLICY "insert_checklists" ON checklists
  FOR INSERT TO authenticated
  WITH CHECK (get_user_perfil() IN ('admin', 'frota', 'motorista'));

CREATE POLICY "update_checklists" ON checklists
  FOR UPDATE TO authenticated
  USING (responsavel_id = auth.uid() OR is_admin_or_frota())
  WITH CHECK (responsavel_id = auth.uid() OR is_admin_or_frota());

CREATE POLICY "insert_checklist_respostas" ON checklist_respostas
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM checklists c
      WHERE c.id = checklist_id
      AND (c.responsavel_id = auth.uid() OR is_admin_or_frota())
    )
  );

CREATE POLICY "update_checklist_respostas" ON checklist_respostas
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

CREATE POLICY "insert_checklist_fotos" ON checklist_fotos
  FOR INSERT TO authenticated
  WITH CHECK (enviado_por = auth.uid() OR is_admin_or_frota());

CREATE POLICY "update_checklist_fotos" ON checklist_fotos
  FOR UPDATE TO authenticated
  USING (enviado_por = auth.uid() OR is_admin_or_frota())
  WITH CHECK (enviado_por = auth.uid() OR is_admin_or_frota());

CREATE POLICY "insert_checklist_assinaturas" ON checklist_assinaturas
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM checklists c
      WHERE c.id = checklist_id
      AND (c.responsavel_id = auth.uid() OR is_admin_or_frota())
    )
  );

-- ============================================================
-- ESTADO DO VEÍCULO — atualizado pelo fluxo de checklist/auditoria.
-- Histórico não deve ser editado nem deletado.
-- ============================================================

CREATE POLICY "insert_veiculo_estado_atual" ON veiculo_estado_atual
  FOR INSERT TO authenticated
  WITH CHECK (get_user_perfil() IN ('admin', 'frota', 'motorista'));

CREATE POLICY "update_veiculo_estado_atual" ON veiculo_estado_atual
  FOR UPDATE TO authenticated
  USING (get_user_perfil() IN ('admin', 'frota', 'motorista'))
  WITH CHECK (get_user_perfil() IN ('admin', 'frota', 'motorista'));

CREATE POLICY "insert_veiculo_estado_historico" ON veiculo_estado_historico
  FOR INSERT TO authenticated
  WITH CHECK (get_user_perfil() IN ('admin', 'frota', 'motorista', 'manutencao'));

-- ============================================================
-- AUDITORIAS — agendamento pela frota; execução por frota/motorista.
-- ============================================================

CREATE POLICY "frota_manage_auditoria_agendamentos" ON auditoria_agendamentos
  FOR ALL TO authenticated
  USING (is_admin_or_frota())
  WITH CHECK (is_admin_or_frota());

CREATE POLICY "insert_auditorias" ON auditorias
  FOR INSERT TO authenticated
  WITH CHECK (get_user_perfil() IN ('admin', 'frota', 'motorista'));

CREATE POLICY "update_auditorias" ON auditorias
  FOR UPDATE TO authenticated
  USING (responsavel_id = auth.uid() OR is_admin_or_frota())
  WITH CHECK (responsavel_id = auth.uid() OR is_admin_or_frota());

CREATE POLICY "insert_auditoria_respostas" ON auditoria_respostas
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auditorias a
      WHERE a.id = auditoria_id
      AND (a.responsavel_id = auth.uid() OR is_admin_or_frota())
    )
  );

CREATE POLICY "update_auditoria_respostas" ON auditoria_respostas
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auditorias a
      WHERE a.id = auditoria_id
      AND (a.responsavel_id = auth.uid() OR is_admin_or_frota())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auditorias a
      WHERE a.id = auditoria_id
      AND (a.responsavel_id = auth.uid() OR is_admin_or_frota())
    )
  );

-- ============================================================
-- OCORRÊNCIAS — qualquer autenticado abre; frota/manutenção tratam.
-- ============================================================

CREATE POLICY "insert_ocorrencias" ON ocorrencias
  FOR INSERT TO authenticated
  WITH CHECK (aberta_por = auth.uid() OR is_admin_or_frota());

CREATE POLICY "update_ocorrencias" ON ocorrencias
  FOR UPDATE TO authenticated
  USING (get_user_perfil() IN ('admin', 'frota', 'manutencao'))
  WITH CHECK (get_user_perfil() IN ('admin', 'frota', 'manutencao'));

CREATE POLICY "insert_ocorrencia_historico" ON ocorrencia_historico
  FOR INSERT TO authenticated
  WITH CHECK (feito_por = auth.uid() OR get_user_perfil() IN ('admin', 'frota', 'manutencao'));

-- ============================================================
-- TELEMETRIA — estrutura pronta, sem integração ativa nesta etapa.
-- Escrita limitada a admin/frota para impedir uso acidental pela operação.
-- ============================================================

CREATE POLICY "frota_manage_integracoes_telemetria" ON integracoes_telemetria
  FOR ALL TO authenticated
  USING (is_admin_or_frota())
  WITH CHECK (is_admin_or_frota());

CREATE POLICY "frota_manage_telemetria_veiculos" ON telemetria_veiculos
  FOR ALL TO authenticated
  USING (is_admin_or_frota())
  WITH CHECK (is_admin_or_frota());

CREATE POLICY "frota_manage_telemetria_odometro" ON telemetria_odometro
  FOR ALL TO authenticated
  USING (is_admin_or_frota())
  WITH CHECK (is_admin_or_frota());

CREATE POLICY "frota_manage_telemetria_eventos" ON telemetria_eventos
  FOR ALL TO authenticated
  USING (is_admin_or_frota())
  WITH CHECK (is_admin_or_frota());

CREATE POLICY "frota_manage_telemetria_sync_logs" ON telemetria_sync_logs
  FOR ALL TO authenticated
  USING (is_admin_or_frota())
  WITH CHECK (is_admin_or_frota());
