'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, Eye, Clock, CheckCircle2,
  XCircle, Filter
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Table } from '@/components/ui/Table'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import {
  STATUS_OCORRENCIA_LABEL,
  STATUS_TRATATIVA_LABEL,
  GRAVIDADE_LABEL,
  RESPONSAVEL_OCORRENCIA_LABEL,
  TIPO_VEICULO_LABEL,
} from '@/lib/constants'
import { formatarData, diasAteVencer } from '@/utils'

type Ocorrencia = {
  id: string; numero: number; descricao: string
  gravidade: string; responsavel: string; prazo: string | null; status: string
  criado_em: string; data_resolucao: string | null
  veiculos: { id: string; placa: string; codigo_frota: string | null; tipo: string } | null
  checklist_items: { id: string; nome: string } | null
  status_tratativa?: string | null
  email_status?: string | null
  email_enviado_em?: string | null
  bloqueante?: boolean | null
}

const STATUS_ENCERRADOS = ['resolvida', 'reprovada', 'cancelada']
const isEncerrada = (status: string) => STATUS_ENCERRADOS.includes(status)


interface Props {
  ocorrenciasIniciais: Ocorrencia[]
  contadores: { abertas: number; criticas: number; emAnalise: number; aguardando: number }
}

const gravidadeBadge: Record<string, 'red' | 'orange' | 'yellow' | 'gray'> = {
  critica: 'red', alta: 'orange', media: 'yellow', baixa: 'gray',
}

const statusBadge: Record<string, 'red' | 'orange' | 'yellow' | 'blue' | 'green' | 'gray'> = {
  aberta: 'red',
  em_analise: 'orange',
  aguardando_manutencao: 'yellow',
  resolvida: 'green',
  reprovada: 'gray',
  cancelada: 'gray',
}

const tratativaBadge: Record<string, 'red' | 'orange' | 'yellow' | 'blue' | 'green' | 'gray'> = {
  nao_conformidade_aberta: 'red',
  encaminhado_manutencao: 'blue',
  aguardando_devolutiva_manutencao: 'yellow',
  em_analise_manutencao: 'orange',
  aguardando_envio_oficina: 'yellow',
  em_oficina: 'blue',
  resolvido_aguardando_validacao: 'orange',
  validada_liberada: 'green',
  cancelada: 'gray',
}

function statusLegivel(o: Ocorrencia) {
  if (o.status_tratativa) {
    return STATUS_TRATATIVA_LABEL[o.status_tratativa as keyof typeof STATUS_TRATATIVA_LABEL] ?? o.status_tratativa
  }
  return STATUS_OCORRENCIA_LABEL[o.status as keyof typeof STATUS_OCORRENCIA_LABEL] ?? o.status
}

function statusVariant(o: Ocorrencia) {
  if (o.status_tratativa && tratativaBadge[o.status_tratativa]) return tratativaBadge[o.status_tratativa]
  return statusBadge[o.status] ?? 'gray'
}

const statusOptions = [
  { value: '', label: 'Todos os status' },
  ...Object.entries(STATUS_OCORRENCIA_LABEL).map(([v, l]) => ({ value: v, label: l })),
]

const gravidadeOptions = [
  { value: '', label: 'Toda gravidade' },
  ...Object.entries(GRAVIDADE_LABEL).map(([v, l]) => ({ value: v, label: l })),
]

const responsavelOptions = [
  { value: '', label: 'Todos responsáveis' },
  ...Object.entries(RESPONSAVEL_OCORRENCIA_LABEL).map(([v, l]) => ({ value: v, label: l })),
]

export function OcorrenciasCliente({ ocorrenciasIniciais, contadores }: Props) {
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroGravidade, setFiltroGravidade] = useState('')
  const [filtroResponsavel, setFiltroResponsavel] = useState('')

  const filtradas = useMemo(() => {
    return ocorrenciasIniciais.filter((o) => {
      const t = busca.toLowerCase()
      const matchBusca = !busca ||
        o.descricao.toLowerCase().includes(t) ||
        (o.veiculos?.placa ?? '').toLowerCase().includes(t) ||
        (o.checklist_items?.nome ?? '').toLowerCase().includes(t) ||
        String(o.numero).includes(t)
      const matchStatus = !filtroStatus || o.status === filtroStatus
      const matchGravidade = !filtroGravidade || o.gravidade === filtroGravidade
      const matchResponsavel = !filtroResponsavel || o.responsavel === filtroResponsavel
      return matchBusca && matchStatus && matchGravidade && matchResponsavel
    })
  }, [ocorrenciasIniciais, busca, filtroStatus, filtroGravidade, filtroResponsavel])

  const abertas = filtradas.filter((o) => !isEncerrada(o.status))
  const resolvidas = filtradas.filter((o) => isEncerrada(o.status))

  return (
    <div className="flex-1 p-6 space-y-5">
      {/* Contadores rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Abertas"
          value={contadores.abertas}
          icon={AlertTriangle}
          color={contadores.abertas > 0 ? 'red' : 'green'}
        />
        <StatCard
          title="Críticas"
          value={contadores.criticas}
          icon={XCircle}
          color={contadores.criticas > 0 ? 'red' : 'green'}
        />
        <StatCard
          title="Em análise"
          value={contadores.emAnalise}
          icon={Eye}
          color={contadores.emAnalise > 0 ? 'orange' : 'slate'}
        />
        <StatCard
          title="Aguard. manutenção"
          value={contadores.aguardando}
          icon={Clock}
          color={contadores.aguardando > 0 ? 'yellow' : 'slate'}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={busca}
          onChange={setBusca}
          placeholder="Buscar por placa, item, descrição..."
          className="w-64"
        />
        <Select
          options={statusOptions}
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="w-44"
        />
        <Select
          options={gravidadeOptions}
          value={filtroGravidade}
          onChange={(e) => setFiltroGravidade(e.target.value)}
          className="w-40"
        />
        <Select
          options={responsavelOptions}
          value={filtroResponsavel}
          onChange={(e) => setFiltroResponsavel(e.target.value)}
          className="w-44"
        />
        {(busca || filtroStatus || filtroGravidade || filtroResponsavel) && (
          <button
            onClick={() => { setBusca(''); setFiltroStatus(''); setFiltroGravidade(''); setFiltroResponsavel('') }}
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <Filter className="w-3.5 h-3.5" />
            Limpar filtros
          </button>
        )}
      </div>

      {/* Ocorrências em aberto */}
      {(filtroStatus === '' || !isEncerrada(filtroStatus)) && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Em andamento ({abertas.length})
          </h2>
          <Card padding="none">
            <Table
              data={abertas}
              rowKey={(o) => o.id}
              emptyIcon={CheckCircle2}
              emptyTitle="Nenhuma ocorrência em aberto"
              emptyDescription="Todos os itens estão conformes"
              onRowClick={(o) => router.push(`/ocorrencias/${o.id}`)}
              columns={[
                {
                  key: 'numero',
                  label: '#',
                  className: 'w-16',
                  render: (o) => (
                    <span className="text-slate-400 text-xs font-mono">#{o.numero}</span>
                  ),
                },
                {
                  key: 'gravidade',
                  label: 'Gravidade',
                  className: 'w-28',
                  render: (o) => (
                    <Badge variant={gravidadeBadge[o.gravidade] ?? 'gray'}>
                      {GRAVIDADE_LABEL[o.gravidade as keyof typeof GRAVIDADE_LABEL] ?? o.gravidade}
                    </Badge>
                  ),
                },
                {
                  key: 'veiculo',
                  label: 'Veículo',
                  render: (o) => (
                    <div>
                      <p className="font-semibold text-slate-900 font-mono text-sm">
                        {o.veiculos?.placa ?? '—'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {TIPO_VEICULO_LABEL[o.veiculos?.tipo as keyof typeof TIPO_VEICULO_LABEL] ?? '—'}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'item',
                  label: 'Item',
                  render: (o) => (
                    <span className="text-slate-600 text-sm">{o.checklist_items?.nome ?? '—'}</span>
                  ),
                },
                {
                  key: 'descricao',
                  label: 'Descrição',
                  render: (o) => (
                    <span className="text-slate-500 text-sm line-clamp-1">{o.descricao}</span>
                  ),
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (o) => (
                    <Badge variant={statusVariant(o)}>
                      {statusLegivel(o)}
                    </Badge>
                  ),
                },
                {
                  key: 'responsavel',
                  label: 'Responsável',
                  render: (o) => (
                    <span className="text-slate-500 text-sm">
                      {RESPONSAVEL_OCORRENCIA_LABEL[o.responsavel as keyof typeof RESPONSAVEL_OCORRENCIA_LABEL] ?? '—'}
                    </span>
                  ),
                },
                {
                  key: 'prazo',
                  label: 'Prazo',
                  render: (o) => {
                    if (!o.prazo) return <span className="text-slate-300 text-xs">—</span>
                    const dias = diasAteVencer(o.prazo)
                    if (dias === null) return <span className="text-slate-400 text-xs">{formatarData(o.prazo)}</span>
                    if (dias < 0) return <Badge variant="red">{Math.abs(dias)}d vencido</Badge>
                    if (dias <= 2) return <Badge variant="red">{dias}d</Badge>
                    if (dias <= 7) return <Badge variant="yellow">{dias}d</Badge>
                    return <span className="text-slate-400 text-xs">{formatarData(o.prazo)}</span>
                  },
                },
                {
                  key: 'criado',
                  label: 'Aberta em',
                  render: (o) => (
                    <span className="text-slate-400 text-xs">{formatarData(o.criado_em)}</span>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      )}

      {/* Histórico resolvidas */}
      {(filtroStatus === '' || isEncerrada(filtroStatus)) && resolvidas.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Encerradas ({resolvidas.length})
          </h2>
          <Card padding="none">
            <Table
              data={resolvidas}
              rowKey={(o) => o.id}
              emptyIcon={CheckCircle2}
              emptyTitle="Nenhuma ocorrência encerrada"
              onRowClick={(o) => router.push(`/ocorrencias/${o.id}`)}
              columns={[
                {
                  key: 'numero',
                  label: '#',
                  className: 'w-16',
                  render: (o) => (
                    <span className="text-slate-400 text-xs font-mono">#{o.numero}</span>
                  ),
                },
                {
                  key: 'veiculo',
                  label: 'Veículo',
                  render: (o) => (
                    <span className="font-semibold text-slate-700 font-mono text-sm">
                      {o.veiculos?.placa ?? '—'}
                    </span>
                  ),
                },
                {
                  key: 'item',
                  label: 'Item',
                  render: (o) => (
                    <span className="text-slate-500 text-sm">{o.checklist_items?.nome ?? '—'}</span>
                  ),
                },
                {
                  key: 'gravidade',
                  label: 'Gravidade',
                  render: (o) => (
                    <Badge variant={gravidadeBadge[o.gravidade] ?? 'gray'}>
                      {GRAVIDADE_LABEL[o.gravidade as keyof typeof GRAVIDADE_LABEL] ?? o.gravidade}
                    </Badge>
                  ),
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (o) => (
                    <Badge variant={statusVariant(o)}>
                      {statusLegivel(o)}
                    </Badge>
                  ),
                },
                {
                  key: 'resolvida',
                  label: 'Encerrada em',
                  render: (o) => (
                    <span className="text-slate-400 text-xs">
                      {formatarData(o.data_resolucao ?? o.criado_em)}
                    </span>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      )}
    </div>
  )
}
