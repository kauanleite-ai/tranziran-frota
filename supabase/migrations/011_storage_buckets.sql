-- ============================================================
-- STORAGE CONFIGURATION
-- Buckets privados para fotos e assinaturas.
-- Fotos ficam no Storage; o banco salva apenas o caminho.
-- ============================================================

-- ---- BUCKETS ----
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('checklist-fotos', 'checklist-fotos', FALSE, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('auditoria-fotos', 'auditoria-fotos', FALSE, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('ocorrencia-fotos', 'ocorrencia-fotos', FALSE, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('assinaturas', 'assinaturas', FALSE, 2097152, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---- POLÍTICAS DE STORAGE ----
-- O DROP deixa o arquivo seguro para reexecução em ambiente de desenvolvimento.
DROP POLICY IF EXISTS "upload_checklist_fotos" ON storage.objects;
DROP POLICY IF EXISTS "upload_auditoria_fotos" ON storage.objects;
DROP POLICY IF EXISTS "upload_ocorrencia_fotos" ON storage.objects;
DROP POLICY IF EXISTS "upload_assinaturas" ON storage.objects;
DROP POLICY IF EXISTS "read_checklist_fotos" ON storage.objects;
DROP POLICY IF EXISTS "read_auditoria_fotos" ON storage.objects;
DROP POLICY IF EXISTS "read_ocorrencia_fotos" ON storage.objects;
DROP POLICY IF EXISTS "read_assinaturas" ON storage.objects;
DROP POLICY IF EXISTS "delete_checklist_fotos" ON storage.objects;
DROP POLICY IF EXISTS "delete_auditoria_fotos" ON storage.objects;
DROP POLICY IF EXISTS "delete_ocorrencia_fotos" ON storage.objects;
DROP POLICY IF EXISTS "delete_assinaturas" ON storage.objects;

-- Upload: qualquer usuário autenticado pode enviar para os buckets do sistema.
CREATE POLICY "upload_checklist_fotos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'checklist-fotos');

CREATE POLICY "upload_auditoria_fotos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'auditoria-fotos');

CREATE POLICY "upload_ocorrencia_fotos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ocorrencia-fotos');

CREATE POLICY "upload_assinaturas" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assinaturas');

-- Leitura: qualquer usuário autenticado no sistema pode visualizar evidências.
CREATE POLICY "read_checklist_fotos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'checklist-fotos');

CREATE POLICY "read_auditoria_fotos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'auditoria-fotos');

CREATE POLICY "read_ocorrencia_fotos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'ocorrencia-fotos');

CREATE POLICY "read_assinaturas" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'assinaturas');

-- Deleção: somente admin. Preferencialmente usar soft-delete lógico nos registros de banco.
CREATE POLICY "delete_checklist_fotos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'checklist-fotos'
    AND (SELECT perfil FROM usuarios_perfis WHERE user_id = auth.uid()) = 'admin'
  );

CREATE POLICY "delete_auditoria_fotos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'auditoria-fotos'
    AND (SELECT perfil FROM usuarios_perfis WHERE user_id = auth.uid()) = 'admin'
  );

CREATE POLICY "delete_ocorrencia_fotos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'ocorrencia-fotos'
    AND (SELECT perfil FROM usuarios_perfis WHERE user_id = auth.uid()) = 'admin'
  );

CREATE POLICY "delete_assinaturas" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'assinaturas'
    AND (SELECT perfil FROM usuarios_perfis WHERE user_id = auth.uid()) = 'admin'
  );
