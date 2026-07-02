'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { ItemAuditoriaLinha, type RespostaAuditoriaLocal } from './ItemAuditoriaLinha'
import { finalizarAuditoria } from '@/lib/actions/auditorias'
import type { RespostaAuditoriaInput } from '@/lib/actions/auditorias'

type EstadoItem = {
  resposta: string
  observacao: string | null
  ultima_foto_path: string | null
  data_atualizacao: string
}

type Item = {
  id: string; nome: string; descricao: string | null
  exige_foto: boolean; exige_obs_se_nao_ok: boolean; item_critico: boolean
}
type Categoria = { id: string; nome: string; descricao: string | null; checklist_items: Item[] }

interface Props {
  auditoriaId: string
  veiculoId: string
  motoristaId?: string
  km?: number
  templateVersionId: string
  categorias: Categoria[]
  estadoAtual: Map<string, EstadoItem>
  onVoltar: () => void
}

export function AuditoriaWizard({
  auditoriaId, veiculoId, motoristaId, km: kmInicial,
  categorias, estadoAtual, onVoltar
}: Props) {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const [passoAtual, setPassoAtual] = useState(0)
  const [finalizando, setFinalizando] = useState(false)
  const [observacoesGerais, setObservacoesGerais] = useState('')
  const [km, setKm] = useState(kmInicial?.toString() ?? '')

  const [respostas, setRespostas] = useState<Map<string, RespostaAuditoriaLocal>>(() => {
    const inicial = new Map<string, RespostaAuditoriaLocal>()
    categorias.forEach((cat) => {
      cat.checklist_items.forEach((item) => {
        inicial.set(item.id, { continua_igual: null, resposta_nova: null, observacao: '', fotos: [] })
      })
    })
    return inicial
  })

  const [sessaoId] = useState(() => Date.now().toString(36))
  const pastaStorage = `${veiculoId}/auditoria-${sessaoId}`

  const totalItens = categorias.reduce((acc, c) => acc + c.checklist_items.length, 0)
  const totalRespondidos = Array.from(respostas.values()).filter((r) => r.continua_igual !== null).length
  const progresso = totalItens > 0 ? Math.round((totalRespondidos / totalItens) * 100) : 0
  const totalMudou = Array.from(respostas.values()).filter((r) => r.continua_igual === false).length

  const categoriaAtual = categorias[passoAtual]
  const ehUltimoPasso = passoAtual === categorias.length - 1
  const ehPrimeiroPasso = passoAtual === 0

  function atualizarResposta(itemId: string, valor: RespostaAuditoriaLocal) {
    setRespostas((prev) => new Map(prev).set(itemId, valor))
  }

  // Valida pendências da categoria atual
  const pendenciasCat = useMemo(() => {
    if (!categoriaAtual) return []
    return categoriaAtual.checklist_items.filter((item) => {
      const r = respostas.get(item.id)
      if (!r || r.continua_igual === null) return true
      if (r.continua_igual === true && item.exige_foto && r.fotos.length === 0) return true
      if (r.continua_igual === false) {
        if (!r.resposta_nova) return true
        if (item.exige_foto && r.fotos.length === 0) return true
        if (item.exige_obs_se_nao_ok && r.resposta_nova === 'nao_ok' && !r.observacao.trim()) return true
      }
      return false
    })
  }, [categoriaAtual, respostas])

  // Valida todas as pendências antes de finalizar
  const todasPendencias = useMemo(() => {
    const pendencias: string[] = []
    categorias.forEach((cat) => {
      cat.checklist_items.forEach((item) => {
        const r = respostas.get(item.id)
        if (!r || r.continua_igual === null) {
          pendencias.push(`${item.nome} (não verificado)`)
        } else if (r.continua_igual === true && item.exige_foto && r.fotos.length === 0) {
          pendencias.push(`${item.nome} (foto de confirmação pendente)`)
        } else if (r.continua_igual === false) {
          if (!r.resposta_nova) pendencias.push(`${item.nome} (novo status pendente)`)
          else if (item.exige_foto && r.fotos.length === 0) pendencias.push(`${item.nome} (foto obrigatória)`)
          else if (item.exige_obs_se_nao_ok && r.resposta_nova === 'nao_ok' && !r.observacao.trim()) {
            pendencias.push(`${item.nome} (observação obrigatória)`)
          }
        }
      })
    })
    return pendencias
  }, [categorias, respostas])

  function irParaProximo() {
    if (pendenciasCat.length > 0) {
      toastError(`${pendenciasCat.length} item(ns) pendente(s) nesta categoria.`)
      return
    }
    if (!ehUltimoPasso) setPassoAtual((p) => p + 1)
  }

  function irParaAnterior() {
    if (ehPrimeiroPasso) onVoltar()
    else setPassoAtual((p) => p - 1)
  }

  async function handleFinalizar() {
    if (todasPendencias.length > 0) {
      toastError(`Ainda há ${todasPendencias.length} pendência(s). Revise todas as categorias.`)
      return
    }

    setFinalizando(true)
    try {
      const respostasPayload: RespostaAuditoriaInput[] = Array.from(respostas.entries()).map(
        ([item_id, r]) => ({
          item_id,
          continua_igual: r.continua_igual ?? true,
          resposta_nova: r.resposta_nova ?? undefined,
          observacao: r.observacao || undefined,
          fotos: r.fotos.length > 0 ? r.fotos : undefined,
        })
      )

      const resultado = await finalizarAuditoria({
        auditoria_id: auditoriaId,
        veiculo_id: veiculoId,
        motorista_id: motoristaId,
        km: km ? Number(km) : undefined,
        observacoes_gerais: observacoesGerais || undefined,
        respostas: respostasPayload,
      })

      success(`Auditoria concluída! Próxima agendada para ${resultado.dataProxima}.`)
      router.push(`/auditorias/${resultado.auditoria_id}`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao finalizar auditoria.')
      setFinalizando(false)
    }
  }

  if (!categoriaAtual) return null

  return (
    <div className="flex-1 flex flex-col">
      {/* Barra de progresso */}
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>
            {totalRespondidos}/{totalItens} itens verificados
            {totalMudou > 0 && (
              <span className="ml-2 text-orange-500 font-medium">
                · {totalMudou} com alteração
              </span>
            )}
          </span>
          <span>{progresso}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      {/* Chips de categorias */}
      <div className="px-6 pt-4 pb-2 flex items-center gap-2 overflow-x-auto">
        {categorias.map((cat, idx) => {
          const itens = cat.checklist_items
          const respondidos = itens.filter((i) => respostas.get(i.id)?.continua_igual !== null).length
          const completa = respondidos === itens.length
          return (
            <button
              key={cat.id}
              onClick={() => setPassoAtual(idx)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                idx === passoAtual
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : completa
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {completa && idx !== passoAtual && <CheckCircle2 className="w-3 h-3" />}
              {cat.nome}
              <span className="opacity-60">{respondidos}/{itens.length}</span>
            </button>
          )
        })}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 p-6 pt-2 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-4">
          <Card padding="none">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-sm">{categoriaAtual.nome}</h2>
              {categoriaAtual.descricao && (
                <p className="text-xs text-slate-400 mt-0.5">{categoriaAtual.descricao}</p>
              )}
            </div>
            {categoriaAtual.checklist_items.map((item) => (
              <ItemAuditoriaLinha
                key={item.id}
                item={item}
                estadoAnterior={estadoAtual.get(item.id) ?? null}
                valor={respostas.get(item.id) ?? { continua_igual: null, resposta_nova: null, observacao: '', fotos: [] }}
                onChange={(valor) => atualizarResposta(item.id, valor)}
                pastaStorage={pastaStorage}
              />
            ))}
          </Card>

          {/* KM e observações — última categoria */}
          {ehUltimoPasso && (
            <Card className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  KM atual do veículo
                </label>
                <input
                  type="number"
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                  placeholder="Ex: 155000"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  Observações gerais
                </label>
                <textarea
                  value={observacoesGerais}
                  onChange={(e) => setObservacoesGerais(e.target.value)}
                  placeholder="Observações adicionais sobre esta auditoria"
                  rows={3}
                  className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </Card>
          )}

          {ehUltimoPasso && todasPendencias.length > 0 && (
            <div className="flex items-start gap-3 p-3.5 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-orange-700">
                  {todasPendencias.length} pendência(s) antes de finalizar
                </p>
                <ul className="text-xs text-orange-500 mt-1 list-disc list-inside space-y-0.5">
                  {todasPendencias.slice(0, 5).map((p) => <li key={p}>{p}</li>)}
                  {todasPendencias.length > 5 && (
                    <li>e mais {todasPendencias.length - 5} item(ns)...</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rodapé fixo */}
      <div className="border-t border-slate-200 bg-white p-4 flex items-center justify-between gap-3 sticky bottom-0">
        <Button variant="outline" onClick={irParaAnterior}>
          <ChevronLeft className="w-4 h-4" />
          {ehPrimeiroPasso ? 'Voltar' : 'Categoria anterior'}
        </Button>

        {ehUltimoPasso ? (
          <Button
            onClick={handleFinalizar}
            loading={finalizando}
            size="lg"
            disabled={todasPendencias.length > 0 && !finalizando}
          >
            {finalizando ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Finalizando...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" />Finalizar auditoria</>
            )}
          </Button>
        ) : (
          <Button onClick={irParaProximo}>
            Próxima categoria
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
