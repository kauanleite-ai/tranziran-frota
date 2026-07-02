-- ============================================================
-- MIGRATION 001 — ENUMS
-- Tranziran Sistema de Frota
-- ============================================================

-- Perfis de usuário
CREATE TYPE perfil_usuario AS ENUM (
  'admin',
  'frota',
  'motorista',
  'manutencao',
  'gestor',
  'auditor'
);

-- Status de veículo
CREATE TYPE status_veiculo AS ENUM (
  'ativo',
  'inativo',
  'manutencao',
  'vendido'
);

-- Tipo de veículo
CREATE TYPE tipo_veiculo AS ENUM (
  'cavalo',
  'carreta',
  'bau',
  'truck',
  'carro_passeio',
  'guindaste',
  'outro'
);

-- Status de motorista
CREATE TYPE status_motorista AS ENUM (
  'ativo',
  'inativo',
  'ferias',
  'afastado'
);

-- Tipo de resposta de item de checklist
CREATE TYPE tipo_resposta_item AS ENUM (
  'status_padrao',
  'texto',
  'numero',
  'booleano',
  'data'
);

-- Resposta de item (legenda original: X / N / A / N/A)
CREATE TYPE resposta_item AS ENUM (
  'ok',         -- X = OK
  'nao_tem',    -- N = Não tem
  'nao_ok',     -- A = Não está OK
  'nao_aplica'  -- N/A = Não se aplica
);

-- Tipo de checklist
CREATE TYPE tipo_checklist AS ENUM (
  'saida',
  'retorno',
  'base'
);

-- Status de checklist
CREATE TYPE status_checklist AS ENUM (
  'em_andamento',
  'concluido',
  'cancelado'
);

-- Status de auditoria
CREATE TYPE status_auditoria AS ENUM (
  'pendente',
  'em_andamento',
  'concluida',
  'cancelada',
  'vencida'
);

-- Status de agendamento de auditoria
CREATE TYPE status_agendamento AS ENUM (
  'pendente',
  'realizada',
  'vencida',
  'cancelada'
);

-- Gravidade de ocorrência
CREATE TYPE gravidade_ocorrencia AS ENUM (
  'baixa',
  'media',
  'alta',
  'critica'
);

-- Status de ocorrência
CREATE TYPE status_ocorrencia AS ENUM (
  'aberta',
  'em_analise',
  'aguardando_manutencao',
  'resolvida',
  'reprovada',
  'cancelada'
);

-- Responsável por ocorrência
CREATE TYPE responsavel_ocorrencia AS ENUM (
  'frota',
  'manutencao',
  'motorista',
  'terceiro'
);

-- Origem de alteração de estado
CREATE TYPE origem_estado AS ENUM (
  'checklist_base',
  'auditoria',
  'ocorrencia_resolvida'
);
