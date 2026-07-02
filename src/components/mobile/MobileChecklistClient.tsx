'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Car, ClipboardList, Gauge, Loader2, Search, Truck, UserRound } from 'lucide-react'
import { dadosParaIniciarChecklist } from '@/lib/actions/checklists'
import { useToast } from '@/components/ui/Toast'
import { MobileChecklistWizard } from './MobileChecklistWizard'
import { TIPO_VEICULO_LABEL } from '@/lib/constants'

type Veiculo = {
  id: string
  placa: string
  codigo_frota: string | null
  tipo: string
  km_atual: number | null
  checklist_base_concluido: boolean
}

type Motorista = { id: string; nome: string; matricula: string }

type Item = {
  id: string
  nome: string
  descricao: string | null
  exige_foto: boolean
  exige_obs_se_nao_ok: boolean
  item_critico: boolean
}

type Categoria = { id: string; nome: string; descricao: string | null; checklist_items: Item[] }

type WizardData = {
  veiculoId: string
  motoristaId: string
  tipo: 'base' | 'saida' | 'retorno'
  km: number
  templateVersionId: string
  categorias: Categoria[]
  veiculoResumo: { placa: string; codigo_frota: string | null; tipo: string }
  motoristaResumo: { nome: string; matricula: string } | null
  dataHoraInicio: string
}

interface Props {
  veiculos: Veiculo[]
  motoristas: Motorista[]
  veiculoPreSelecionado?: string
}

export function MobileChecklistClient({ veiculos, motoristas, veiculoPreSelecionado }: Props) {
  const { error: toastError } = useToast()
  const [busca, setBusca] = useState('')
  const [veiculoId, setVeiculoId] = useState(veiculoPreSelecionado ?? '')
  const [motoristaId, setMotoristaId] = useState('')
  const [tipo, setTipo] = useState<'base' | 'saida' | 'retorno'>('base')
  const [km, setKm] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [wizard, setWizard] = useState<WizardData | null>(null)

  const veiculoSelecionado = veiculos.find((v) => v.id === veiculoId)

  const veiculosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const lista = termo
      ? veiculos.filter((v) => v.placa.toLowerCase().includes(termo) || (v.codigo_frota ?? '').toLowerCase().includes(termo))
      : veiculos
    return lista.slice(0, 80)
  }, [busca, veiculos])

  function selecionarVeiculo(id: string) {
    const veiculo = veiculos.find((v) => v.id === id)
    setVeiculoId(id)
    if (veiculo) {
      setKm(veiculo.km_atual ? String(veiculo.km_atual) : '')
      setTipo(veiculo.checklist_base_concluido ? 'saida' : 'base')
    }
  }

  async function iniciar() {
    if (!veiculoId || !km) {
      toastError('Selecione o veículo e informe o KM atual.')
      return
    }

    setCarregando(true)
    try {
      const resultado = await dadosParaIniciarChecklist(veiculoId)
      const motoristaSelecionado = motoristas.find((m) => m.id === motoristaId) ?? null
      const veiculo = veiculos.find((v) => v.id === veiculoId) ?? resultado.veiculo

      setWizard({
        veiculoId,
        motoristaId,
        tipo,
        km: Number(km),
        templateVersionId: resultado.template_version_id,
        categorias: resultado.categorias as never,
        veiculoResumo: {
          placa: veiculo.placa,
          codigo_frota: 'codigo_frota' in veiculo ? veiculo.codigo_frota : null,
          tipo: veiculo.tipo,
        },
        motoristaResumo: motoristaSelecionado ? { nome: motoristaSelecionado.nome, matricula: motoristaSelecionado.matricula } : null,
        dataHoraInicio: new Date().toISOString(),
      })
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao iniciar checklist.')
    } finally {
      setCarregando(false)
    }
  }

  if (wizard) {
    return <MobileChecklistWizard {...wizard} onVoltar={() => setWizard(null)} />
  }

  return (
    <div className="flex-1 space-y-4 p-4 pb-24">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-bold text-slate-800">Buscar veículo</label>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Digite placa ou frota"
            className="min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="mt-3 max-h-[340px] space-y-2 overflow-y-auto pr-1">
          {veiculosFiltrados.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Nenhum veículo encontrado.</p>
          ) : (
            veiculosFiltrados.map((veiculo) => {
              const selecionado = veiculo.id === veiculoId
              const Icon = veiculo.tipo === 'carro_passeio' ? Car : Truck
              return (
                <button
                  key={veiculo.id}
                  type="button"
                  onClick={() => selecionarVeiculo(veiculo.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] ${
                    selecionado ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-base font-bold text-slate-950">{veiculo.placa}</p>
                    <p className="truncate text-xs text-slate-500">
                      {TIPO_VEICULO_LABEL[veiculo.tipo as keyof typeof TIPO_VEICULO_LABEL] ?? veiculo.tipo}
                      {veiculo.codigo_frota ? ` · Frota ${veiculo.codigo_frota}` : ''}
                    </p>
                  </div>
                  {!veiculo.checklist_base_concluido && (
                    <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-bold text-orange-700">Sem base</span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {veiculoSelecionado && (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-bold text-slate-800">Dados do preenchimento</p>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-sm font-bold text-slate-700"><ClipboardList className="h-4 w-4" /> Tipo</span>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as never)}
                disabled={!veiculoSelecionado.checklist_base_concluido}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-medium outline-none disabled:bg-slate-100"
              >
                {!veiculoSelecionado.checklist_base_concluido ? (
                  <option value="base">Checklist base obrigatório</option>
                ) : (
                  <>
                    <option value="saida">Saída</option>
                    <option value="retorno">Retorno</option>
                    <option value="base">Checklist base</option>
                  </>
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-sm font-bold text-slate-700"><UserRound className="h-4 w-4" /> Motorista vinculado</span>
              <select
                value={motoristaId}
                onChange={(e) => setMotoristaId(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-medium outline-none"
              >
                <option value="">Sem motorista informado</option>
                {motoristas.map((motorista) => (
                  <option key={motorista.id} value={motorista.id}>{motorista.nome} — {motorista.matricula}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-sm font-bold text-slate-700"><Gauge className="h-4 w-4" /> KM atual</span>
              <input
                value={km}
                onChange={(e) => setKm(e.target.value)}
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Ex: 152340"
                className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-lg font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={iniciar}
            disabled={carregando || !km}
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {carregando ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
            {carregando ? 'Carregando checklist...' : 'Começar preenchimento'}
          </button>
        </div>
      )}

      <div className="rounded-3xl bg-slate-200/60 p-4 text-xs leading-relaxed text-slate-500">
        Este portal é para o conferente interno da Tranziran preencher pelo celular. O motorista não precisa acessar o sistema.
      </div>

      <Link href="/mobile" className="block text-center text-sm font-bold text-blue-700">Voltar ao início mobile</Link>
    </div>
  )
}
