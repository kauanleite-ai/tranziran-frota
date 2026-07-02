'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Truck, User, Calendar, Activity,
  Pencil, UserPlus, CheckCircle2, XCircle, Clock
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { VeiculoForm } from '@/components/veiculos/VeiculoForm'
import { atualizarVeiculo, vincularMotorista } from '@/lib/actions/veiculos'
import type { VeiculoFormData } from '@/lib/actions/veiculos'
import { TIPO_VEICULO_LABEL, STATUS_VEICULO_LABEL } from '@/lib/constants'
import { formatarData, formatarKm, diasAteVencer } from '@/utils'

type Veiculo = {
  id: string; placa: string; codigo_frota: string | null
  tipo: string; fabricante: string | null; modelo: string | null
  ano: number | null; status: string; km_atual: number | null
  checklist_base_concluido: boolean
  data_checklist_base: string | null; data_proxima_auditoria: string | null
  empresas: { id: string; nome: string } | null
  unidades: { id: string; nome: string } | null
  veiculo_motorista_vinculos: Array<{
    id: string; ativo: boolean; data_inicio: string
    motoristas: { id: string; nome: string; matricula: string } | null
  }>
}

type Empresa = { id: string; nome: string }
type Unidade = { id: string; nome: string; empresa_id: string }
type Motorista = { id: string; nome: string; matricula: string }

interface Props {
  veiculo: Veiculo
  empresas: Empresa[]
  unidades: Unidade[]
  motoristas: Motorista[]
}

export function VeiculoDetalheCliente({ veiculo, empresas, unidades, motoristas }: Props) {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const [modalEditar, setModalEditar] = useState(false)
  const [modalVincular, setModalVincular] = useState(false)
  const [motoristaSelecionado, setMotoristaSelecionado] = useState('')
  const [loadingVinculo, setLoadingVinculo] = useState(false)

  const motoristaAtivo = veiculo.veiculo_motorista_vinculos?.find((v) => v.ativo)
  const historicoVinculos = veiculo.veiculo_motorista_vinculos?.filter((v) => !v.ativo) ?? []

  const diasAuditoria = diasAteVencer(veiculo.data_proxima_auditoria)

  async function handleEditar(data: VeiculoFormData) {
    await atualizarVeiculo(veiculo.id, data)
    success('Veículo atualizado!')
    setModalEditar(false)
    router.refresh()
  }

  async function handleVincular() {
    if (!motoristaSelecionado) return
    setLoadingVinculo(true)
    try {
      await vincularMotorista(veiculo.id, motoristaSelecionado)
      success('Motorista vinculado com sucesso!')
      setModalVincular(false)
      setMotoristaSelecionado('')
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao vincular motorista.')
    } finally {
      setLoadingVinculo(false)
    }
  }

  const motoristasOptions = motoristas.map((m) => ({
    value: m.id,
    label: `${m.nome} — ${m.matricula}`,
  }))

  return (
    <div className="flex-1 p-6 space-y-5">
      {/* Voltar */}
      <button
        onClick={() => router.push('/veiculos')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para veículos
      </button>

      {/* Cards superiores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Identificação */}
        <Card className="md:col-span-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-mono">{veiculo.placa}</h2>
                <p className="text-slate-500 text-sm">
                  {TIPO_VEICULO_LABEL[veiculo.tipo as keyof typeof TIPO_VEICULO_LABEL]}
                  {veiculo.codigo_frota && ` · Frota #${veiculo.codigo_frota}`}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={veiculo.status === 'ativo' ? 'green' : veiculo.status === 'manutencao' ? 'yellow' : 'gray'}>
                    {STATUS_VEICULO_LABEL[veiculo.status as keyof typeof STATUS_VEICULO_LABEL]}
                  </Badge>
                  {!veiculo.checklist_base_concluido && (
                    <Badge variant="orange">Sem checklist base</Badge>
                  )}
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setModalEditar(true)}>
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-100">
            {[
              { label: 'Fabricante', value: veiculo.fabricante ?? '—' },
              { label: 'Modelo', value: veiculo.modelo ?? '—' },
              { label: 'Ano', value: veiculo.ano ?? '—' },
              { label: 'KM Atual', value: formatarKm(veiculo.km_atual) },
              { label: 'Empresa', value: veiculo.empresas?.nome ?? '—' },
              { label: 'Base', value: veiculo.unidades?.nome ?? '—' },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-slate-400 font-medium">{item.label}</p>
                <p className="text-sm text-slate-800 font-medium mt-0.5">{String(item.value)}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Status de auditoria */}
        <Card>
          <CardHeader title="Auditoria" />
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {veiculo.checklist_base_concluido ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-orange-400 shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium text-slate-700">Checklist Base</p>
                <p className="text-xs text-slate-400">
                  {veiculo.checklist_base_concluido
                    ? formatarData(veiculo.data_checklist_base)
                    : 'Não realizado'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {diasAuditoria === null ? (
                <Clock className="w-5 h-5 text-slate-300 shrink-0" />
              ) : diasAuditoria < 0 ? (
                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
              ) : diasAuditoria <= 7 ? (
                <Clock className="w-5 h-5 text-yellow-500 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium text-slate-700">Próxima Auditoria</p>
                <p className="text-xs text-slate-400">
                  {veiculo.data_proxima_auditoria
                    ? `${formatarData(veiculo.data_proxima_auditoria)}${diasAuditoria !== null ? ` (${diasAuditoria < 0 ? `${Math.abs(diasAuditoria)}d atraso` : `${diasAuditoria}d`})` : ''}`
                    : 'Não agendada'}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Motorista atual */}
      <Card>
        <CardHeader
          title="Motorista Atual"
          action={
            <Button variant="outline" size="sm" onClick={() => setModalVincular(true)}>
              <UserPlus className="w-3.5 h-3.5" />
              Vincular motorista
            </Button>
          }
        />
        {motoristaAtivo?.motoristas ? (
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{motoristaAtivo.motoristas.nome}</p>
              <p className="text-sm text-slate-500">
                Matrícula: {motoristaAtivo.motoristas.matricula} · Desde {formatarData(motoristaAtivo.data_inicio)}
              </p>
            </div>
            <Badge variant="green" className="ml-auto">Ativo</Badge>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
            <User className="w-5 h-5 text-slate-300" />
            <p className="text-sm text-slate-400">Nenhum motorista vinculado a este veículo</p>
          </div>
        )}

        {historicoVinculos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Histórico de motoristas
            </p>
            <div className="space-y-2">
              {historicoVinculos.slice(0, 5).map((v) => (
                <div key={v.id} className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-slate-300 shrink-0" />
                  <span className="text-slate-600">{v.motoristas?.nome ?? '—'}</span>
                  <span className="text-slate-400 text-xs ml-auto">
                    desde {formatarData(v.data_inicio)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Histórico de atividades — placeholder para próximas etapas */}
      <Card>
        <CardHeader
          title="Histórico de Checklists e Auditorias"
          description="Disponível nas próximas etapas"
        />
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Activity className="w-8 h-8 text-slate-200 mb-2" />
          <p className="text-sm text-slate-400">
            O histórico completo será exibido após a implementação dos módulos de checklist e auditoria.
          </p>
        </div>
      </Card>

      {/* Modal editar */}
      <Modal
        open={modalEditar}
        onClose={() => setModalEditar(false)}
        title="Editar Veículo"
        size="lg"
      >
        <VeiculoForm
          inicial={{
            id: veiculo.id,
            placa: veiculo.placa,
            codigo_frota: veiculo.codigo_frota ?? '',
            empresa_id: veiculo.empresas?.id ?? '',
            unidade_id: veiculo.unidades?.id ?? '',
            tipo: veiculo.tipo,
            fabricante: veiculo.fabricante ?? '',
            modelo: veiculo.modelo ?? '',
            ano: veiculo.ano ?? undefined,
            status: veiculo.status,
            km_atual: veiculo.km_atual ?? undefined,
          }}
          empresas={empresas}
          unidades={unidades}
          onSave={handleEditar}
          onCancel={() => setModalEditar(false)}
        />
      </Modal>

      {/* Modal vincular motorista */}
      <Modal
        open={modalVincular}
        onClose={() => setModalVincular(false)}
        title="Vincular Motorista"
        description="Selecione o motorista responsável por este veículo"
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Motorista"
            value={motoristaSelecionado}
            onChange={(e) => setMotoristaSelecionado(e.target.value)}
            options={motoristasOptions}
            placeholder="Selecione o motorista"
          />
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setModalVincular(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleVincular}
              loading={loadingVinculo}
              disabled={!motoristaSelecionado}
            >
              Vincular
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
