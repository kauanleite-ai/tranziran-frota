// Legenda do checklist
export const LEGENDA_RESPOSTA = {
  ok: { label: 'OK', sigla: 'X', cor: 'green' },
  nao_tem: { label: 'Não tem', sigla: 'N', cor: 'gray' },
  nao_ok: { label: 'Não está OK', sigla: 'A', cor: 'red' },
  nao_aplica: { label: 'Não se aplica', sigla: 'N/A', cor: 'slate' },
} as const

// Perfis de usuário
export const PERFIL_LABEL = {
  admin: 'Administrador',
  frota: 'Frota',
  motorista: 'Motorista',
  manutencao: 'Manutenção',
  gestor: 'Gestor',
  auditor: 'Auditor',
} as const

// Status de veículo
export const STATUS_VEICULO_LABEL = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  manutencao: 'Em Manutenção',
  vendido: 'Vendido',
} as const

// Status operacional do veículo — controla bloqueio/liberação para novos checklists
export const STATUS_OPERACIONAL_LABEL = {
  liberado: 'Liberado',
  nao_conformidade_aberta: 'Não conformidade aberta',
  encaminhado_manutencao: 'Encaminhado à manutenção',
  aguardando_devolutiva_manutencao: 'Aguardando devolutiva da manutenção',
  aguardando_envio_oficina: 'Aguardando envio para oficina',
  em_oficina: 'Em oficina',
  resolvido_aguardando_validacao: 'Resolvido — aguardando validação',
} as const

// Tipos de veículo
export const TIPO_VEICULO_LABEL = {
  cavalo: 'Cavalo Mecânico',
  carreta: 'Carreta',
  bau: 'Baú',
  truck: 'Truck',
  carro_passeio: 'Carro de Passeio',
  guindaste: 'Guindaste',
  outro: 'Outro',
} as const

// Status de checklist
export const STATUS_CHECKLIST_LABEL = {
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
} as const

// Status de auditoria
export const STATUS_AUDITORIA_LABEL = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  vencida: 'Vencida',
} as const

// Status de ocorrência
export const STATUS_OCORRENCIA_LABEL = {
  aberta: 'Aberta',
  em_analise: 'Em Análise',
  aguardando_manutencao: 'Encaminhada à Manutenção',
  resolvida: 'Resolvida',
  reprovada: 'Reprovada',
  cancelada: 'Cancelada',
} as const

// Status detalhado da tratativa da ocorrência
export const STATUS_TRATATIVA_LABEL = {
  nao_conformidade_aberta: 'Não conformidade aberta',
  encaminhado_manutencao: 'Encaminhado à manutenção',
  aguardando_devolutiva_manutencao: 'Aguardando devolutiva da manutenção',
  em_analise_manutencao: 'Em análise pela manutenção',
  aguardando_envio_oficina: 'Aguardando envio para oficina',
  em_oficina: 'Em oficina',
  resolvido_aguardando_validacao: 'Resolvido — aguardando validação da Frota',
  validada_liberada: 'Validada e liberada',
  cancelada: 'Cancelada',
} as const

// Gravidade de ocorrência
export const GRAVIDADE_LABEL = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
} as const

// Responsável por ocorrência
export const RESPONSAVEL_OCORRENCIA_LABEL = {
  frota: 'Frota',
  manutencao: 'Manutenção',
  motorista: 'Motorista',
  terceiro: 'Terceiro',
} as const

// Tipo de checklist
export const TIPO_CHECKLIST_LABEL = {
  saida: 'Saída',
  retorno: 'Retorno',
  base: 'Base',
} as const

// Tipo de resposta de item de template
export const TIPO_RESPOSTA_ITEM_LABEL = {
  status_padrao: 'Status (X / N / A / N/A)',
  texto: 'Texto livre',
  numero: 'Número',
  booleano: 'Sim / Não',
  data: 'Data',
} as const

// Aplicabilidade de item por tipo de veículo
export const APLICA_TIPO_LABEL = {
  aplica_cavalo: 'Cavalo',
  aplica_carreta: 'Carreta',
  aplica_bau: 'Baú',
  aplica_truck: 'Truck',
  aplica_carro_passeio: 'Carro de Passeio',
  aplica_guindaste: 'Guindaste',
} as const

// Intervalo de auditoria em dias
export const INTERVALO_AUDITORIA_DIAS = 15

// Rotas do sistema
export const ROTAS = {
  login: '/login',
  dashboard: '/dashboard',
  veiculos: '/veiculos',
  motoristas: '/motoristas',
  checklists: '/checklists',
  templates: '/templates',
  auditorias: '/auditorias',
  ocorrencias: '/ocorrencias',
  configuracoes: '/configuracoes',
} as const
