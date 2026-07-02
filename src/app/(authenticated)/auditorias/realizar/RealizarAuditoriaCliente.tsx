'use client'

import { useState, useEffect } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { AuditoriaWizard } from '@/components/auditorias/AuditoriaWizard'
import { dadosParaIniciarAuditoria, criarAuditoria } from '@/lib/actions/auditorias'

type EstadoItem = {
  resposta: string; observacao: string | null
  ultima_foto_path: string | null; data_atualizacao: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DadosAuditoria = Record<string, any> & {
  agendamento: { id: string; veiculo_id: string }
  veiculo: { id: string; placa: string; tipo: string; km_atual: number | null }
  template_version_id: string
  estadoAtual: Map<string, EstadoItem>
  motoristaAtivo: { id: string; nome: string; matricula: string } | null
}

interface Props {
  agendamentoId: string
}

export function RealizarAuditoriaCliente({ agendamentoId }: Props) {
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [dados, setDados] = useState<DadosAuditoria | null>(null)
  const [auditoriaId, setAuditoriaId] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      try {
        const resultado = await dadosParaIniciarAuditoria(agendamentoId)
        if (!ativo) return

        // Cria a auditoria no banco imediatamente (para tracking)
        const auditoria = await criarAuditoria(
          resultado.agendamento.veiculo_id,
          resultado.template_version_id,
          agendamentoId,
          resultado.motoristaAtivo?.id
        )

        if (ativo) {
          setDados({
            ...resultado,
            estadoAtual: resultado.estadoAtual as Map<string, EstadoItem>,
          })
          setAuditoriaId(auditoria.id)
        }
      } catch (err) {
        if (ativo) {
          setErro(err instanceof Error ? err.message : 'Erro ao carregar auditoria.')
        }
      } finally {
        if (ativo) setCarregando(false)
      }
    }
    carregar()
    return () => { ativo = false }
  }, [agendamentoId])

  if (carregando) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm text-slate-500">Carregando estado do veículo...</p>
        <p className="text-xs text-slate-400">Isso pode levar alguns segundos</p>
      </div>
    )
  }

  if (erro || !dados || !auditoriaId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-slate-600 font-medium">Não foi possível carregar a auditoria</p>
        <p className="text-slate-400 text-sm max-w-md">{erro ?? 'Erro desconhecido'}</p>
      </div>
    )
  }

  return (
    <AuditoriaWizard
      auditoriaId={auditoriaId}
      veiculoId={dados.veiculo.id}
      motoristaId={dados.motoristaAtivo?.id}
      km={dados.veiculo.km_atual ?? undefined}
      templateVersionId={dados.template_version_id}
      categorias={dados.categorias}
      estadoAtual={dados.estadoAtual}
      onVoltar={() => window.history.back()}
    />
  )
}
