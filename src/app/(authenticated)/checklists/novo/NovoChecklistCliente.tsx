'use client'

import { useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { SeletorInicial } from '@/components/checklists/SeletorInicial'
import { ChecklistWizard } from '@/components/checklists/ChecklistWizard'
import { dadosParaIniciarChecklist } from '@/lib/actions/checklists'
import { useToast } from '@/components/ui/Toast'

type Veiculo = {
  id: string; placa: string; codigo_frota: string | null; tipo: string
  km_atual: number | null; checklist_base_concluido: boolean
}
type Motorista = { id: string; nome: string; matricula: string }
type Item = {
  id: string; nome: string; descricao: string | null
  exige_foto: boolean; exige_obs_se_nao_ok: boolean; item_critico: boolean
}
type Categoria = { id: string; nome: string; descricao: string | null; checklist_items: Item[] }

interface Props {
  veiculos: Veiculo[]
  motoristas: Motorista[]
  veiculoPreSelecionado?: string
}

type EstadoWizard = {
  veiculoId: string
  motoristaId: string
  tipo: 'base' | 'saida' | 'retorno'
  km: number
  templateVersionId: string
  categorias: Categoria[]
  veiculoResumo: {
    placa: string
    codigo_frota: string | null
    tipo: string
  }
  motoristaResumo: {
    nome: string
    matricula: string
  } | null
  dataHoraInicio: string
}

export function NovoChecklistCliente({ veiculos, motoristas, veiculoPreSelecionado }: Props) {
  const { error: toastError } = useToast()
  const [carregando, setCarregando] = useState(false)
  const [wizardData, setWizardData] = useState<EstadoWizard | null>(null)

  async function handleIniciar(dados: {
    veiculoId: string; motoristaId: string; tipo: 'base' | 'saida' | 'retorno'; km: number
  }) {
    setCarregando(true)
    try {
      const resultado = await dadosParaIniciarChecklist(dados.veiculoId)
      const veiculoSelecionado = veiculos.find((v) => v.id === dados.veiculoId)
      const motoristaSelecionado = motoristas.find((m) => m.id === dados.motoristaId) ?? null

      setWizardData({
        veiculoId: dados.veiculoId,
        motoristaId: dados.motoristaId,
        tipo: dados.tipo,
        km: dados.km,
        templateVersionId: resultado.template_version_id,
        categorias: resultado.categorias as never,
        veiculoResumo: {
          placa: veiculoSelecionado?.placa ?? resultado.veiculo.placa,
          codigo_frota: veiculoSelecionado?.codigo_frota ?? null,
          tipo: veiculoSelecionado?.tipo ?? resultado.veiculo.tipo,
        },
        motoristaResumo: motoristaSelecionado
          ? { nome: motoristaSelecionado.nome, matricula: motoristaSelecionado.matricula }
          : null,
        dataHoraInicio: new Date().toISOString(),
      })
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao carregar template do checklist.')
    } finally {
      setCarregando(false)
    }
  }

  if (carregando) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm text-slate-500">Carregando template do checklist...</p>
      </div>
    )
  }

  if (wizardData) {
    return (
      <ChecklistWizard
        veiculoId={wizardData.veiculoId}
        motoristaId={wizardData.motoristaId}
        tipo={wizardData.tipo}
        km={wizardData.km}
        templateVersionId={wizardData.templateVersionId}
        categorias={wizardData.categorias}
        veiculoResumo={wizardData.veiculoResumo}
        motoristaResumo={wizardData.motoristaResumo}
        dataHoraInicio={wizardData.dataHoraInicio}
        onVoltar={() => setWizardData(null)}
      />
    )
  }

  if (veiculos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
        <AlertCircle className="w-10 h-10 text-slate-300" />
        <p className="text-slate-500 font-medium">Nenhum veículo cadastrado</p>
        <p className="text-slate-400 text-sm">Cadastre um veículo antes de iniciar um checklist.</p>
      </div>
    )
  }

  return (
    <SeletorInicial
      veiculos={veiculos}
      motoristas={motoristas}
      veiculoPreSelecionado={veiculoPreSelecionado}
      onIniciar={handleIniciar}
    />
  )
}
