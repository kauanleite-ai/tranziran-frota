// ============================================================
// TIPOS DO BANCO DE DADOS SUPABASE — TRANZIRAN FROTA
// Mantido manualmente nesta etapa. Em produção, preferir:
// supabase gen types typescript --project-id <id> > src/types/database.ts
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ---- ENUMS ----
export type PerfilUsuario = 'admin' | 'frota' | 'motorista' | 'manutencao' | 'gestor' | 'auditor'
export type StatusVeiculo = 'ativo' | 'inativo' | 'manutencao' | 'vendido'
export type StatusOperacionalVeiculo =
  | 'liberado'
  | 'nao_conformidade_aberta'
  | 'encaminhado_manutencao'
  | 'aguardando_devolutiva_manutencao'
  | 'aguardando_envio_oficina'
  | 'em_oficina'
  | 'resolvido_aguardando_validacao'
export type TipoVeiculo = 'cavalo' | 'carreta' | 'bau' | 'truck' | 'carro_passeio' | 'guindaste' | 'outro'
export type StatusMotorista = 'ativo' | 'inativo' | 'ferias' | 'afastado'
export type TipoRespostaItem = 'status_padrao' | 'texto' | 'numero' | 'booleano' | 'data'
export type RespostaItem = 'ok' | 'nao_tem' | 'nao_ok' | 'nao_aplica'
export type TipoChecklist = 'saida' | 'retorno' | 'base'
export type StatusChecklist = 'em_andamento' | 'concluido' | 'cancelado'
export type StatusAuditoria = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada' | 'vencida'
export type StatusAgendamento = 'pendente' | 'realizada' | 'vencida' | 'cancelada'
export type GravidadeOcorrencia = 'baixa' | 'media' | 'alta' | 'critica'
export type StatusOcorrencia = 'aberta' | 'em_analise' | 'aguardando_manutencao' | 'resolvida' | 'reprovada' | 'cancelada'
export type StatusTratativaOcorrencia =
  | 'nao_conformidade_aberta'
  | 'encaminhado_manutencao'
  | 'aguardando_devolutiva_manutencao'
  | 'em_analise_manutencao'
  | 'aguardando_envio_oficina'
  | 'em_oficina'
  | 'resolvido_aguardando_validacao'
  | 'validada_liberada'
  | 'cancelada'
export type ResponsavelOcorrencia = 'frota' | 'manutencao' | 'motorista' | 'terceiro'
export type OrigemEstado = 'checklist_base' | 'auditoria' | 'ocorrencia_resolvida'

// ---- HELPERS ----
type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: never[]
}

// ---- CADASTROS ----
export interface Empresa {
  id: string
  nome: string
  cnpj: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface Unidade {
  id: string
  empresa_id: string
  nome: string
  cidade: string | null
  estado: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface UsuarioPerfil {
  id: string
  user_id: string
  nome: string
  email: string
  perfil: PerfilUsuario
  empresa_id: string | null
  unidade_id: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface Motorista {
  id: string
  nome: string
  matricula: string
  cpf: string | null
  telefone: string | null
  empresa_id: string
  unidade_id: string | null
  cnh: string | null
  cnh_validade: string | null
  mopp: boolean
  mopp_validade: string | null
  status: StatusMotorista
  criado_em: string
  atualizado_em: string
}

export interface Veiculo {
  id: string
  placa: string
  codigo_frota: string | null
  empresa_id: string
  unidade_id: string | null
  tipo: TipoVeiculo
  fabricante: string | null
  modelo: string | null
  ano: number | null
  status: StatusVeiculo
  km_atual: number | null
  telemetria_id: string | null
  telemetria_provider: string | null
  checklist_base_concluido: boolean
  data_checklist_base: string | null
  data_proxima_auditoria: string | null
  status_operacional: StatusOperacionalVeiculo
  bloqueado_checklist: boolean
  ocorrencia_bloqueante_id: string | null
  bloqueio_motivo: string | null
  data_bloqueio: string | null
  data_liberacao_operacional: string | null
  criado_em: string
  atualizado_em: string
}

export interface VeiculoMotoristaVinculo {
  id: string
  veiculo_id: string
  motorista_id: string
  data_inicio: string
  data_fim: string | null
  ativo: boolean
  criado_em: string
}

// ---- TEMPLATES ----
export interface ChecklistTemplate {
  id: string
  nome: string
  descricao: string | null
  versao_atual_id: string | null
  ativo: boolean
  criado_por: string | null
  criado_em: string
  atualizado_em: string
}

export interface ChecklistTemplateVersion {
  id: string
  template_id: string
  versao: number
  publicado: boolean
  publicado_em: string | null
  criado_por: string | null
  criado_em: string
}

export interface ChecklistCategoria {
  id: string
  template_version_id: string
  nome: string
  descricao: string | null
  ordem: number
  ativo: boolean
  criado_em: string
}

export interface ChecklistItem {
  id: string
  categoria_id: string
  nome: string
  descricao: string | null
  tipo_resposta: TipoRespostaItem
  exige_foto: boolean
  exige_obs_se_nao_ok: boolean
  item_critico: boolean
  aplica_cavalo: boolean
  aplica_carreta: boolean
  aplica_bau: boolean
  aplica_truck: boolean
  aplica_carro_passeio: boolean
  aplica_guindaste: boolean
  ordem: number
  ativo: boolean
  criado_em: string
}

export interface ChecklistItemRule {
  id: string
  item_id: string
  regra: string
  valor: string | null
  criado_em: string
}

// ---- CHECKLISTS ----
export interface Checklist {
  id: string
  veiculo_id: string
  motorista_id: string | null
  template_version_id: string
  tipo: TipoChecklist
  status: StatusChecklist
  km: number | null
  observacoes_gerais: string | null
  responsavel_id: string
  data_inicio: string
  data_conclusao: string | null
  latitude: number | null
  longitude: number | null
  ip_dispositivo: string | null
  user_agent: string | null
  criado_em: string
  atualizado_em: string
}

export interface ChecklistResposta {
  id: string
  checklist_id: string
  item_id: string
  resposta: RespostaItem | null
  observacao: string | null
  gera_ocorrencia: boolean
  ocorrencia_id: string | null
  criado_em: string
  atualizado_em: string
}

export interface ChecklistFoto {
  id: string
  checklist_id: string | null
  resposta_id: string | null
  auditoria_resposta_id: string | null
  auditoria_id: string | null
  ocorrencia_id: string | null
  storage_path: string
  nome_original: string
  tamanho_bytes: number | null
  mime_type: string | null
  descricao: string | null
  enviado_por: string
  criado_em: string
}

export interface ChecklistAssinatura {
  id: string
  checklist_id: string
  tipo: string
  nome: string
  storage_path: string | null
  criado_em: string
}

// ---- ESTADO DO VEÍCULO ----
export interface VeiculoEstadoAtual {
  id: string
  veiculo_id: string
  item_id: string
  resposta: RespostaItem
  observacao: string | null
  ultima_foto_path: string | null
  atualizado_por_checklist_id: string | null
  atualizado_por_auditoria_id: string | null
  data_atualizacao: string
  quem_atualizou: string
}

export interface VeiculoEstadoHistorico {
  id: string
  veiculo_id: string
  item_id: string
  resposta_anterior: RespostaItem | null
  resposta_nova: RespostaItem
  observacao_anterior: string | null
  observacao_nova: string | null
  foto_anterior_path: string | null
  foto_nova_path: string | null
  origem: OrigemEstado
  checklist_id: string | null
  auditoria_id: string | null
  ocorrencia_id: string | null
  quem_alterou: string
  criado_em: string
}

// ---- AUDITORIAS ----
export interface AuditoriaAgendamento {
  id: string
  veiculo_id: string
  data_agendada: string
  data_realizada: string | null
  auditoria_id: string | null
  status: StatusAgendamento
  criado_em: string
}

export interface Auditoria {
  id: string
  veiculo_id: string
  motorista_id: string | null
  template_version_id: string
  status: StatusAuditoria
  km: number | null
  observacoes_gerais: string | null
  responsavel_id: string
  data_inicio: string
  data_conclusao: string | null
  agendamento_id: string | null
  latitude: number | null
  longitude: number | null
  criado_em: string
  atualizado_em: string
}

export interface AuditoriaResposta {
  id: string
  auditoria_id: string
  item_id: string
  continua_igual: boolean | null
  resposta_nova: RespostaItem | null
  observacao: string | null
  gera_ocorrencia: boolean
  ocorrencia_id: string | null
  criado_em: string
  atualizado_em: string
}

// ---- OCORRÊNCIAS ----
export interface Ocorrencia {
  id: string
  numero: number
  veiculo_id: string
  checklist_id: string | null
  auditoria_id: string | null
  item_id: string
  descricao: string
  gravidade: GravidadeOcorrencia
  responsavel: ResponsavelOcorrencia
  prazo: string | null
  status: StatusOcorrencia
  bloqueante: boolean
  status_tratativa: StatusTratativaOcorrencia
  email_enviado_em: string | null
  email_destinatarios: string[] | null
  email_status: string
  email_erro: string | null
  protocolo_email: string | null
  data_encaminhado_manutencao: string | null
  data_devolutiva_manutencao: string | null
  data_solicitado_oficina: string | null
  data_entrada_oficina: string | null
  data_saida_oficina: string | null
  data_validacao_frota: string | null
  dias_em_oficina: number | null
  dias_pendencia_total: number | null
  devolutiva_manutencao: string | null
  aberta_por: string
  resolvida_por: string | null
  data_resolucao: string | null
  criado_em: string
  atualizado_em: string
}

export interface OcorrenciaHistorico {
  id: string
  ocorrencia_id: string
  status_anterior: StatusOcorrencia | null
  status_novo: StatusOcorrencia
  observacao: string | null
  feito_por: string
  criado_em: string
}


export interface OcorrenciaAcessoManutencao {
  id: string
  ocorrencia_id: string
  token: string
  ativo: boolean
  expira_em: string | null
  usado_em: string | null
  criado_em: string
}

export interface OcorrenciaEmailLog {
  id: string
  ocorrencia_id: string
  destinatarios: string[]
  assunto: string
  corpo_html: string | null
  status: string
  provider: string | null
  provider_id: string | null
  erro: string | null
  criado_em: string
}

// ---- TELEMETRIA FUTURA ----
export interface IntegracaoTelemetria {
  id: string
  nome: string
  provider: string
  api_url: string | null
  api_key: string | null
  ativo: boolean
  criado_em: string
}

export interface TelemetriaVeiculo {
  id: string
  veiculo_id: string
  integracao_id: string
  telemetria_external_id: string
  ativo: boolean
  criado_em: string
}

export interface TelemetriaOdometro {
  id: string
  veiculo_id: string
  km: number
  fonte: string
  capturado_em: string
  criado_em: string
}

export interface TelemetriaEvento {
  id: string
  veiculo_id: string
  tipo_evento: string
  latitude: number | null
  longitude: number | null
  valor: string | null
  capturado_em: string
  criado_em: string
}

export interface TelemetriaSyncLog {
  id: string
  integracao_id: string
  status: string
  registros: number | null
  erro_mensagem: string | null
  criado_em: string
}

// ---- DATABASE TYPE ----
export interface Database {
  public: {
    Tables: {
      empresas: Table<Empresa>
      unidades: Table<Unidade>
      usuarios_perfis: Table<UsuarioPerfil>
      motoristas: Table<Motorista>
      veiculos: Table<Veiculo>
      veiculo_motorista_vinculos: Table<VeiculoMotoristaVinculo>
      checklist_templates: Table<ChecklistTemplate>
      checklist_template_versions: Table<ChecklistTemplateVersion>
      checklist_categorias: Table<ChecklistCategoria>
      checklist_items: Table<ChecklistItem>
      checklist_item_rules: Table<ChecklistItemRule>
      checklists: Table<Checklist>
      checklist_respostas: Table<ChecklistResposta>
      checklist_fotos: Table<ChecklistFoto>
      checklist_assinaturas: Table<ChecklistAssinatura>
      veiculo_estado_atual: Table<VeiculoEstadoAtual>
      veiculo_estado_historico: Table<VeiculoEstadoHistorico>
      auditoria_agendamentos: Table<AuditoriaAgendamento>
      auditorias: Table<Auditoria>
      auditoria_respostas: Table<AuditoriaResposta>
      ocorrencias: Table<Ocorrencia>
      ocorrencia_historico: Table<OcorrenciaHistorico>
      ocorrencia_acessos_manutencao: Table<OcorrenciaAcessoManutencao>
      ocorrencia_email_logs: Table<OcorrenciaEmailLog>
      integracoes_telemetria: Table<IntegracaoTelemetria>
      telemetria_veiculos: Table<TelemetriaVeiculo>
      telemetria_odometro: Table<TelemetriaOdometro>
      telemetria_eventos: Table<TelemetriaEvento>
      telemetria_sync_logs: Table<TelemetriaSyncLog>
    }
    Views: Record<string, never>
    Functions: {
      get_user_perfil: { Args: Record<string, never>; Returns: PerfilUsuario | null }
      get_user_empresa_id: { Args: Record<string, never>; Returns: string | null }
      is_admin_or_frota: { Args: Record<string, never>; Returns: boolean }
    }
    Enums: {
      perfil_usuario: PerfilUsuario
      status_veiculo: StatusVeiculo
      tipo_veiculo: TipoVeiculo
      status_motorista: StatusMotorista
      tipo_resposta_item: TipoRespostaItem
      resposta_item: RespostaItem
      tipo_checklist: TipoChecklist
      status_checklist: StatusChecklist
      status_auditoria: StatusAuditoria
      status_agendamento: StatusAgendamento
      gravidade_ocorrencia: GravidadeOcorrencia
      status_ocorrencia: StatusOcorrencia
      responsavel_ocorrencia: ResponsavelOcorrencia
      origem_estado: OrigemEstado
    }
    CompositeTypes: Record<string, never>
  }
}
