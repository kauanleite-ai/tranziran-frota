'use client'

import { useState, useMemo } from 'react'
import { Truck, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { Badge } from '@/components/ui/Badge'
import { TIPO_VEICULO_LABEL, TIPO_CHECKLIST_LABEL } from '@/lib/constants'

type Veiculo = {
  id: string; placa: string; codigo_frota: string | null; tipo: string
  km_atual: number | null; checklist_base_concluido: boolean
}
type Motorista = { id: string; nome: string; matricula: string }

interface Props {
  veiculos: Veiculo[]
  motoristas: Motorista[]
  veiculoPreSelecionado?: string
  onIniciar: (dados: {
    veiculoId: string
    motoristaId: string
    tipo: 'base' | 'saida' | 'retorno'
    km: number
  }) => void
}

export function SeletorInicial({ veiculos, motoristas, veiculoPreSelecionado, onIniciar }: Props) {
  const [busca, setBusca] = useState('')
  const [veiculoId, setVeiculoId] = useState(veiculoPreSelecionado ?? '')
  const [motoristaId, setMotoristaId] = useState('')
  const [tipo, setTipo] = useState<'base' | 'saida' | 'retorno'>('base')
  const [km, setKm] = useState('')

  const veiculoSelecionado = veiculos.find((v) => v.id === veiculoId)

  const veiculosFiltrados = useMemo(() => {
    if (!busca) return veiculos
    const t = busca.toLowerCase()
    return veiculos.filter((v) => v.placa.toLowerCase().includes(t) || (v.codigo_frota ?? '').toLowerCase().includes(t))
  }, [veiculos, busca])

  function selecionarVeiculo(id: string) {
    setVeiculoId(id)
    const v = veiculos.find((x) => x.id === id)
    if (v) {
      setKm(v.km_atual ? String(v.km_atual) : '')
      setTipo(v.checklist_base_concluido ? 'saida' : 'base')
    }
  }

  const tipoOptions = veiculoSelecionado?.checklist_base_concluido
    ? [
        { value: 'saida', label: TIPO_CHECKLIST_LABEL.saida },
        { value: 'retorno', label: TIPO_CHECKLIST_LABEL.retorno },
      ]
    : [{ value: 'base', label: `${TIPO_CHECKLIST_LABEL.base} (obrigatório — primeiro registro)` }]

  function handleContinuar() {
    if (!veiculoId || !km) return
    onIniciar({ veiculoId, motoristaId, tipo, km: Number(km) })
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-2xl mx-auto space-y-5">
        <Card>
          <p className="text-sm font-medium text-slate-700 mb-3">1. Selecione o veículo</p>
          <SearchInput value={busca} onChange={setBusca} placeholder="Buscar por placa ou código..." className="mb-3" />
          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {veiculosFiltrados.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Nenhum veículo encontrado</p>
            ) : (
              veiculosFiltrados.map((v) => (
                <button
                  key={v.id}
                  onClick={() => selecionarVeiculo(v.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                    veiculoId === v.id
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm font-mono">{v.placa}</p>
                      <p className="text-xs text-slate-500">
                        {TIPO_VEICULO_LABEL[v.tipo as keyof typeof TIPO_VEICULO_LABEL]}
                        {v.codigo_frota && ` · #${v.codigo_frota}`}
                      </p>
                    </div>
                  </div>
                  {!v.checklist_base_concluido && <Badge variant="orange">Sem checklist base</Badge>}
                </button>
              ))
            )}
          </div>
        </Card>

        {veiculoSelecionado && (
          <Card className="space-y-4">
            <p className="text-sm font-medium text-slate-700">2. Informações do checklist</p>

            <Select
              label="Tipo de checklist"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as never)}
              options={tipoOptions}
              disabled={!veiculoSelecionado.checklist_base_concluido}
            />

            <Select
              label="Motorista (opcional)"
              value={motoristaId}
              onChange={(e) => setMotoristaId(e.target.value)}
              options={[
                { value: '', label: 'Sem motorista vinculado' },
                ...motoristas.map((m) => ({ value: m.id, label: `${m.nome} — ${m.matricula}` })),
              ]}
            />

            <Input
              label="KM atual"
              type="number"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              placeholder="Ex: 152340"
              required
              min={0}
            />

            <Button onClick={handleContinuar} disabled={!km} className="w-full" size="lg">
              Continuar para o checklist
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
