'use client'

import { useRouter } from 'next/navigation'
import { Search, Clock, XCircle, CheckCircle2, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { TIPO_VEICULO_LABEL } from '@/lib/constants'
import { formatarData, formatarDataHora, diasAteVencer } from '@/utils'

type Agendamento = {
  id: string; data_agendada: string; status: string; auditoria_id: string | null
  veiculos: {
    id: string; placa: string; codigo_frota: string | null; tipo: string; km_atual: number | null
    empresas: { nome: string } | null; unidades: { nome: string } | null
  } | null
}

type AuditoriaHistorico = {
  id: string; status: string; km: number | null; data_inicio: string; data_conclusao: string | null
  veiculos: { id: string; placa: string; codigo_frota: string | null; tipo: string } | null
  motoristas: { id: string; nome: string } | null
}

interface Props {
  agendamentosIniciais: Agendamento[]
  historicoIniciais: AuditoriaHistorico[]
}

export function AuditoriasCliente({ agendamentosIniciais, historicoIniciais }: Props) {
  const router = useRouter()

  const vencidas = agendamentosIniciais.filter((a) => a.status === 'vencida')
  const pendentes = agendamentosIniciais.filter((a) => a.status === 'pendente')

  return (
    <div className="flex-1 p-6 space-y-5">
      {/* Auditoria vencidas — alerta no topo */}
      {vencidas.length > 0 && (
        <Card className="border-red-200 bg-red-50/40">
          <CardHeader
            title={`${vencidas.length} auditoria(s) vencida(s)`}
            description="Essas auditorias ultrapassaram o prazo de 15 dias e precisam ser realizadas imediatamente"
          />
          <div className="space-y-2">
            {vencidas.map((ag) => (
              <div key={ag.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm font-mono">
                      {ag.veiculos?.placa ?? '—'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {TIPO_VEICULO_LABEL[ag.veiculos?.tipo as keyof typeof TIPO_VEICULO_LABEL] ?? '—'}
                      {' · '}
                      <span className="text-red-500">
                        Venceu em {formatarData(ag.data_agendada)}
                        {' ('}
                        {Math.abs(diasAteVencer(ag.data_agendada) ?? 0)}d de atraso
                        {')'}
                      </span>
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => router.push(`/auditorias/realizar?agendamento=${ag.id}`)}
                >
                  <Play className="w-3.5 h-3.5" />
                  Realizar agora
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Auditorias pendentes */}
      {pendentes.length > 0 && (
        <Card>
          <CardHeader
            title="Auditorias Pendentes"
            description="Agendadas e dentro do prazo"
          />
          <div className="space-y-2">
            {pendentes.map((ag) => {
              const dias = diasAteVencer(ag.data_agendada)
              const urgente = (dias ?? 999) <= 3
              return (
                <div key={ag.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${urgente ? 'bg-yellow-100' : 'bg-blue-50'}`}>
                      <Clock className={`w-4 h-4 ${urgente ? 'text-yellow-600' : 'text-blue-500'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm font-mono">
                        {ag.veiculos?.placa ?? '—'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {TIPO_VEICULO_LABEL[ag.veiculos?.tipo as keyof typeof TIPO_VEICULO_LABEL] ?? '—'}
                        {' · '}
                        {ag.veiculos?.unidades?.nome ?? ag.veiculos?.empresas?.nome ?? '—'}
                        {' · '}
                        <span className={urgente ? 'text-yellow-600 font-medium' : ''}>
                          {dias !== null && dias > 0
                            ? `${dias}d restantes`
                            : 'Vence hoje'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={urgente ? 'primary' : 'outline'}
                    onClick={() => router.push(`/auditorias/realizar?agendamento=${ag.id}`)}
                  >
                    <Play className="w-3.5 h-3.5" />
                    Iniciar
                  </Button>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {agendamentosIniciais.length === 0 && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-400 mb-3" />
            <p className="text-slate-600 font-medium">Nenhuma auditoria pendente</p>
            <p className="text-slate-400 text-sm mt-1">
              Todas as auditorias estão em dia. As próximas aparecerão aqui quando vencer o prazo.
            </p>
          </div>
        </Card>
      )}

      {/* Histórico */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Histórico de auditorias realizadas</h2>
        <Card padding="none">
          <Table
            data={historicoIniciais}
            rowKey={(a) => a.id}
            emptyIcon={Search}
            emptyTitle="Nenhuma auditoria realizada ainda"
            emptyDescription="Realize a primeira auditoria de um veículo que já possui checklist base"
            onRowClick={(a) => router.push(`/auditorias/${a.id}`)}
            columns={[
              {
                key: 'veiculo',
                label: 'Veículo',
                render: (a) => (
                  <div>
                    <p className="font-semibold text-slate-900 font-mono">{a.veiculos?.placa ?? '—'}</p>
                    {a.veiculos?.codigo_frota && (
                      <p className="text-xs text-slate-400">#{a.veiculos.codigo_frota}</p>
                    )}
                  </div>
                ),
              },
              {
                key: 'motorista',
                label: 'Motorista',
                render: (a) => (
                  <span className="text-slate-600 text-sm">{a.motoristas?.nome ?? '—'}</span>
                ),
              },
              {
                key: 'km',
                label: 'KM',
                render: (a) => (
                  <span className="text-slate-500 text-sm">
                    {a.km ? a.km.toLocaleString('pt-BR') : '—'}
                  </span>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (a) => (
                  <Badge variant={a.status === 'concluida' ? 'green' : 'yellow'}>
                    {a.status === 'concluida' ? 'Concluída' : 'Em andamento'}
                  </Badge>
                ),
              },
              {
                key: 'data',
                label: 'Realizada em',
                render: (a) => (
                  <span className="text-slate-500 text-sm">
                    {formatarDataHora(a.data_conclusao ?? a.data_inicio)}
                  </span>
                ),
              },
              {
                key: 'tipo',
                label: 'Tipo',
                render: (a) => (
                  <span className="text-slate-400 text-xs">
                    {TIPO_VEICULO_LABEL[a.veiculos?.tipo as keyof typeof TIPO_VEICULO_LABEL] ?? '—'}
                  </span>
                ),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  )
}
