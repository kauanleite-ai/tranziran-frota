'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Loader2, CalendarClock, Gauge, Truck, UserRound, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { ItemLinha, type RespostaEmEdicao } from './ItemLinha'
import { finalizarChecklist } from '@/lib/actions/checklists'
import type { RespostaItemInput } from '@/lib/actions/checklists'

type Item = {
  id: string; nome: string; descricao: string | null
  exige_foto: boolean; exige_obs_se_nao_ok: boolean; item_critico: boolean
}
type Categoria = { id: string; nome: string; descricao: string | null; checklist_items: Item[] }

interface Props {
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
  onVoltar: () => void
}

export function ChecklistWizard({
  veiculoId, motoristaId, tipo, km, templateVersionId, categorias,
  veiculoResumo, motoristaResumo, dataHoraInicio, onVoltar,
}: Props) {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const [passoAtual, setPassoAtual] = useState(0)
  const [finalizando, setFinalizando] = useState(false)
  const [observacoesGerais, setObservacoesGerais] = useState('')

  const [respostas, setRespostas] = useState<Map<string, RespostaEmEdicao>>(() => {
    const inicial = new Map<string, RespostaEmEdicao>()
    categorias.forEach((cat) => {
      cat.checklist_items.forEach((item) => {
        inicial.set(item.id, { resposta: null, observacao: '', fotos: [] })
      })
    })
    return inicial
  })

  // Identificador estável de sessão para organizar as fotos no Storage
  const [sessaoId] = useState(() => Date.now().toString(36))
  const pastaStorage = `${veiculoId}/${tipo}-${sessaoId}`

  const dataHoraFormatada = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dataHoraInicio))

  const tipoChecklistLabel: Record<'base' | 'saida' | 'retorno', string> = {
    base: 'Checklist base',
    saida: 'Saída',
    retorno: 'Retorno',
  }

  const totalItens = categorias.reduce((acc, c) => acc + c.checklist_items.length, 0)
  const totalRespondidos = Array.from(respostas.values()).filter((r) => r.resposta !== null).length
  const progresso = totalItens > 0 ? Math.round((totalRespondidos / totalItens) * 100) : 0

  const categoriaAtual = categorias[passoAtual]
  const ehUltimoPasso = passoAtual === categorias.length - 1
  const ehPrimeiroPasso = passoAtual === 0

  function atualizarResposta(itemId: string, valor: RespostaEmEdicao) {
    setRespostas((prev) => new Map(prev).set(itemId, valor))
  }

  const pendenciasCategoriaAtual = useMemo(() => {
    if (!categoriaAtual) return []
    return categoriaAtual.checklist_items.filter((item) => {
      const r = respostas.get(item.id)
      if (!r || !r.resposta) return true
      if (item.exige_foto && r.fotos.length === 0) return true
      if (item.exige_obs_se_nao_ok && r.resposta === 'nao_ok' && !r.observacao.trim()) return true
      return false
    })
  }, [categoriaAtual, respostas])

  function irParaProximo() {
    if (pendenciasCategoriaAtual.length > 0) {
      toastError(`Existem ${pendenciasCategoriaAtual.length} item(ns) pendente(s) nesta categoria.`)
      return
    }
    if (!ehUltimoPasso) setPassoAtual((p) => p + 1)
  }

  function irParaAnterior() {
    if (ehPrimeiroPasso) onVoltar()
    else setPassoAtual((p) => p - 1)
  }

  const todasPendencias = useMemo(() => {
    const pendencias: string[] = []
    categorias.forEach((cat) => {
      cat.checklist_items.forEach((item) => {
        const r = respostas.get(item.id)
        if (!r || !r.resposta) pendencias.push(`${item.nome} (sem resposta)`)
        else if (item.exige_foto && r.fotos.length === 0) pendencias.push(`${item.nome} (foto obrigatória)`)
        else if (item.exige_obs_se_nao_ok && r.resposta === 'nao_ok' && !r.observacao.trim()) {
          pendencias.push(`${item.nome} (observação obrigatória)`)
        }
      })
    })
    return pendencias
  }, [categorias, respostas])

  async function handleFinalizar() {
    if (todasPendencias.length > 0) {
      toastError(`Ainda há ${todasPendencias.length} pendência(s) no checklist. Revise todas as categorias.`)
      return
    }

    setFinalizando(true)
    try {
      const respostasPayload: RespostaItemInput[] = Array.from(respostas.entries()).map(([item_id, r]) => ({
        item_id,
        resposta: r.resposta,
        observacao: r.observacao || undefined,
        fotos: r.fotos.length > 0 ? r.fotos : undefined,
      }))

      const resultado = await finalizarChecklist({
        veiculo_id: veiculoId,
        motorista_id: motoristaId || undefined,
        template_version_id: templateVersionId,
        tipo,
        km,
        observacoes_gerais: observacoesGerais || undefined,
        respostas: respostasPayload,
      })

      success('Checklist finalizado com sucesso! Próxima auditoria agendada.')
      router.push(`/checklists/${resultado.checklistId}`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao finalizar checklist.')
      setFinalizando(false)
    }
  }

  if (!categoriaAtual) return null

  return (
    <div className="flex-1 flex flex-col">
      {/* Resumo automático do checklist */}
      <div className="px-6 pt-4">
        <Card>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Dados preenchidos automaticamente
              </p>
              <p className="text-sm text-slate-600 mt-1">
                Essas informações vêm da tela anterior e do sistema. Elas ficam salvas no registro do checklist, sem virar pergunta para o motorista.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 text-xs min-w-0">
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1"><Truck className="w-3.5 h-3.5" /> Veículo</div>
                <p className="font-semibold text-slate-800 font-mono">{veiculoResumo.placa}</p>
                {veiculoResumo.codigo_frota && <p className="text-slate-400">Frota {veiculoResumo.codigo_frota}</p>}
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1"><Gauge className="w-3.5 h-3.5" /> KM</div>
                <p className="font-semibold text-slate-800">{km.toLocaleString('pt-BR')}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1"><UserRound className="w-3.5 h-3.5" /> Motorista</div>
                <p className="font-semibold text-slate-800 truncate">{motoristaResumo?.nome ?? 'Não informado'}</p>
                {motoristaResumo?.matricula && <p className="text-slate-400">Mat. {motoristaResumo.matricula}</p>}
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1"><ClipboardList className="w-3.5 h-3.5" /> Tipo</div>
                <p className="font-semibold text-slate-800">{tipoChecklistLabel[tipo]}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1"><CalendarClock className="w-3.5 h-3.5" /> Data/hora</div>
                <p className="font-semibold text-slate-800">{dataHoraFormatada}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Barra de progresso */}
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>{totalRespondidos} de {totalItens} itens respondidos</span>
          <span>{progresso}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      {/* Navegação de categorias (chips) */}
      <div className="px-6 pt-4 pb-2 flex items-center gap-2 overflow-x-auto">
        {categorias.map((cat, idx) => {
          const itensCategoria = cat.checklist_items
          const respondidosCategoria = itensCategoria.filter((i) => respostas.get(i.id)?.resposta).length
          const completa = respondidosCategoria === itensCategoria.length
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
              <span className="opacity-60">{respondidosCategoria}/{itensCategoria.length}</span>
            </button>
          )
        })}
      </div>

      {/* Conteúdo da categoria atual */}
      <div className="flex-1 p-6 pt-2 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-4">
          <Card padding="none">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-sm">{categoriaAtual.nome}</h2>
              {categoriaAtual.descricao && (
                <p className="text-xs text-slate-400 mt-0.5">{categoriaAtual.descricao}</p>
              )}
            </div>
            <div className="divide-y divide-slate-50">
              {categoriaAtual.checklist_items.map((item) => (
                <ItemLinha
                  key={item.id}
                  item={item}
                  valor={respostas.get(item.id) ?? { resposta: null, observacao: '', fotos: [] }}
                  onChange={(valor) => atualizarResposta(item.id, valor)}
                  pastaStorage={pastaStorage}
                />
              ))}
            </div>
          </Card>

          {ehUltimoPasso && (
            <Card>
              <p className="text-sm font-medium text-slate-700 mb-2">Observações gerais do checklist</p>
              <textarea
                value={observacoesGerais}
                onChange={(e) => setObservacoesGerais(e.target.value)}
                placeholder="Alguma observação adicional sobre o veículo ou o checklist?"
                rows={3}
                className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </Card>
          )}

          {ehUltimoPasso && todasPendencias.length > 0 && (
            <div className="flex items-start gap-3 p-3.5 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-orange-700">
                  {todasPendencias.length} pendência(s) antes de finalizar
                </p>
                <p className="text-xs text-orange-500 mt-1">
                  Revise as categorias marcadas sem o ícone de conclusão.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rodapé fixo de navegação */}
      <div className="border-t border-slate-200 bg-white p-4 flex items-center justify-between gap-3 sticky bottom-0">
        <Button variant="outline" onClick={irParaAnterior}>
          <ChevronLeft className="w-4 h-4" />
          {ehPrimeiroPasso ? 'Voltar' : 'Categoria anterior'}
        </Button>

        {ehUltimoPasso ? (
          <Button onClick={handleFinalizar} loading={finalizando} size="lg">
            {finalizando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Finalizando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Finalizar checklist
              </>
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
