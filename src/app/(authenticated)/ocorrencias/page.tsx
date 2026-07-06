import { Header } from '@/components/layout/Header'
import { OcorrenciasCliente } from './OcorrenciasCliente'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Ocorrencia = {
  id: string
  numero: number
  descricao: string
  gravidade: string
  responsavel: string
  prazo: string | null
  status: string
  criado_em: string
  data_resolucao: string | null
  status_tratativa?: string | null
  email_status?: string | null
  email_enviado_em?: string | null
  bloqueante?: boolean | null
  veiculos: {
    id: string
    placa: string
    codigo_frota: string | null
    tipo: string
  } | null
  checklist_items: {
    id: string
    nome: string
  } | null
}

const STATUS_OCORRENCIA_ENCERRADOS = [
  'resolvida',
  'reprovada',
  'cancelada',
]

const STATUS_TRATATIVA_ENCERRADOS = [
  'validada_liberada',
  'liberado_apos_validacao',
  'liberada_apos_validacao',
  'cancelada',
]

function getStatusPrincipal(ocorrencia: Ocorrencia) {
  return ocorrencia.status_tratativa || ocorrencia.status
}

function isEncerrada(ocorrencia: Ocorrencia) {
  const statusPrincipal = getStatusPrincipal(ocorrencia)

  return (
    STATUS_OCORRENCIA_ENCERRADOS.includes(ocorrencia.status) ||
    STATUS_TRATATIVA_ENCERRADOS.includes(statusPrincipal)
  )
}

function isAtiva(ocorrencia: Ocorrencia) {
  return !isEncerrada(ocorrencia)
}

export default async function OcorrenciasPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ocorrencias')
    .select(`
      id,
      numero,
      descricao,
      gravidade,
      responsavel,
      prazo,
      status,
      criado_em,
      data_resolucao,
      status_tratativa,
      email_status,
      email_enviado_em,
      bloqueante,
      veiculos:veiculo_id (
        id,
        placa,
        codigo_frota,
        tipo
      ),
      checklist_items:item_id (
        id,
        nome
      )
    `)
    .order('criado_em', { ascending: false })

  if (error) {
    console.error('Erro ao buscar ocorrências:', error)
  }

  const ocorrencias = (data ?? []) as unknown as Ocorrencia[]

  const ocorrenciasAtivas = ocorrencias.filter(isAtiva)

  const contadores = {
    abertas: ocorrenciasAtivas.length,
    criticas: ocorrenciasAtivas.filter((o) => o.gravidade === 'critica').length,
    emAnalise: ocorrenciasAtivas.filter((o) => {
      const statusPrincipal = getStatusPrincipal(o)

      return (
        o.status === 'em_analise' ||
        statusPrincipal === 'em_analise_manutencao'
      )
    }).length,
    aguardando: ocorrenciasAtivas.filter((o) => {
      const statusPrincipal = getStatusPrincipal(o)

      return (
        o.status === 'aguardando_manutencao' ||
        statusPrincipal === 'encaminhado_manutencao' ||
        statusPrincipal === 'aguardando_devolutiva_manutencao' ||
        statusPrincipal === 'aguardando_envio_oficina'
      )
    }).length,
  }

  return (
    <>
      <Header
        title="Ocorrências"
        subtitle={`${contadores.abertas} aberta(s) • ${contadores.criticas} crítica(s)`}
      />

      <OcorrenciasCliente
        ocorrenciasIniciais={ocorrencias}
        contadores={contadores}
      />
    </>
  )
}