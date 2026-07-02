'use client'

import { useRouter } from 'next/navigation'
import { Plus, ClipboardCheck, AlertTriangle, Truck, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { TIPO_VEICULO_LABEL, TIPO_CHECKLIST_LABEL } from '@/lib/constants'
import { formatarDataHora } from '@/utils'

type Checklist = {
  id: string; tipo: string; status: string; km: number | null
  data_inicio: string; data_conclusao: string | null
  veiculos: { id: string; placa: string; codigo_frota: string | null; tipo: string } | null
  motoristas: { id: string; nome: string; matricula: string } | null
}

type VeiculoPendente = { id: string; placa: string; codigo_frota: string | null; tipo: string; status: string }

interface Props {
  checklistsIniciais: Checklist[]
  veiculosPendentes: VeiculoPendente[]
}

const tipoBadge: Record<string, 'purple' | 'blue' | 'green'> = {
  base: 'purple',
  saida: 'blue',
  retorno: 'green',
}

export function ChecklistsCliente({ checklistsIniciais, veiculosPendentes }: Props) {
  const router = useRouter()

  return (
    <div className="flex-1 p-6 space-y-5">
      {/* Veículos pendentes de checklist base */}
      {veiculosPendentes.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/40">
          <CardHeader
            title="Veículos sem checklist base"
            description="Esses veículos ainda não possuem o registro inicial obrigatório"
          />
          <div className="space-y-2">
            {veiculosPendentes.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm font-mono">{v.placa}</p>
                    <p className="text-xs text-slate-500">
                      {TIPO_VEICULO_LABEL[v.tipo as keyof typeof TIPO_VEICULO_LABEL]}
                      {v.codigo_frota && ` · #${v.codigo_frota}`}
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={() => router.push(`/checklists/novo?veiculo=${v.id}`)}>
                  <Plus className="w-3.5 h-3.5" />
                  Iniciar checklist base
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Ação geral */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Histórico de checklists realizados na frota
        </p>
        <Button onClick={() => router.push('/checklists/novo')}>
          <Plus className="w-4 h-4" />
          Novo checklist
        </Button>
      </div>

      {/* Tabela de histórico */}
      <Card padding="none">
        <Table
          data={checklistsIniciais}
          rowKey={(c) => c.id}
          emptyIcon={ClipboardCheck}
          emptyTitle="Nenhum checklist realizado ainda"
          emptyDescription="Inicie o checklist base de um veículo para começar"
          onRowClick={(c) => router.push(`/checklists/${c.id}`)}
          columns={[
            {
              key: 'veiculo',
              label: 'Veículo',
              render: (c) => (
                <div>
                  <p className="font-semibold text-slate-900 font-mono">{c.veiculos?.placa ?? '—'}</p>
                  {c.veiculos?.codigo_frota && (
                    <p className="text-xs text-slate-400">#{c.veiculos.codigo_frota}</p>
                  )}
                </div>
              ),
            },
            {
              key: 'tipo',
              label: 'Tipo',
              render: (c) => (
                <Badge variant={tipoBadge[c.tipo] ?? 'gray'}>
                  {TIPO_CHECKLIST_LABEL[c.tipo as keyof typeof TIPO_CHECKLIST_LABEL] ?? c.tipo}
                </Badge>
              ),
            },
            {
              key: 'motorista',
              label: 'Motorista',
              render: (c) => (
                <span className="text-slate-600 text-sm">{c.motoristas?.nome ?? '—'}</span>
              ),
            },
            {
              key: 'km',
              label: 'KM',
              render: (c) => (
                <span className="text-slate-500 text-sm">
                  {c.km ? c.km.toLocaleString('pt-BR') : '—'}
                </span>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (c) => (
                <Badge variant={c.status === 'concluido' ? 'green' : c.status === 'cancelado' ? 'red' : 'yellow'}>
                  {c.status === 'concluido' ? 'Concluído' : c.status === 'cancelado' ? 'Cancelado' : 'Em andamento'}
                </Badge>
              ),
            },
            {
              key: 'data',
              label: 'Data',
              render: (c) => (
                <span className="text-slate-500 text-sm">
                  {formatarDataHora(c.data_conclusao ?? c.data_inicio)}
                </span>
              ),
            },
            {
              key: 'ver',
              label: '',
              className: 'w-12',
              render: () => (
                <Eye className="w-4 h-4 text-slate-300" />
              ),
            },
          ]}
        />
      </Card>

      {checklistsIniciais.length === 0 && veiculosPendentes.length === 0 && (
        <div className="flex items-start gap-3 p-3.5 bg-blue-50 border border-blue-100 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-700">
            Todos os veículos ativos já possuem checklist base. Cadastre um novo veículo para começar.
          </p>
        </div>
      )}
    </div>
  )
}
