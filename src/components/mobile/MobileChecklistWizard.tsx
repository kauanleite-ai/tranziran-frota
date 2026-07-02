'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Gauge, Loader2, Truck, UserRound } from 'lucide-react'
import { finalizarChecklist, type RespostaItemInput } from '@/lib/actions/checklists'
import { useToast } from '@/components/ui/Toast'
import { MobileChecklistItem } from './MobileChecklistItem'
import type { RespostaEmEdicao } from '@/components/checklists/ItemLinha'

type Item = {
  id: string
  nome: string
  descricao: string | null
  exige_foto: boolean
  exige_obs_se_nao_ok: boolean
  item_critico: boolean
}

type Categoria = { id: string; nome: string; descricao: string | null; checklist_items: Item[] }

interface Props {
  veiculoId: string
  motoristaId: string
  tipo: 'base' | 'saida' | 'retorno'
  km: number
  templateVersionId: string
  categorias: Categoria[]
  veiculoResumo: { placa: string; codigo_frota: string | null; tipo: string }
  motoristaResumo: { nome: string; matricula: string } | null
  dataHoraInicio: string
  onVoltar: () => void
}

export function MobileChecklistWizard({
  veiculoId,
  motoristaId,
  tipo,
  km,
  templateVersionId,
  categorias,
  veiculoResumo,
  motoristaResumo,
  dataHoraInicio,
  onVoltar,
}: Props) {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const [categoriaAtualIndex, setCategoriaAtualIndex] = useState(0)
  const [finalizando, setFinalizando] = useState(false)
  const [observacoesGerais, setObservacoesGerais] = useState('')
  const [sessaoId] = useState(() => Date.now().toString(36))

  const [respostas, setRespostas] = useState<Map<string, RespostaEmEdicao>>(() => {
    const inicial = new Map<string, RespostaEmEdicao>()
    categorias.forEach((categoria) => {
      categoria.checklist_items.forEach((item) => inicial.set(item.id, { resposta: null, observacao: '', fotos: [] }))
    })
    return inicial
  })

  const pastaStorage = `${veiculoId}/${tipo}-mobile-${sessaoId}`
  const categoriaAtual = categorias[categoriaAtualIndex]
  const totalCategorias = categorias.length
  const totalItens = categorias.reduce((acc, categoria) => acc + categoria.checklist_items.length, 0)
  const totalRespondidos = Array.from(respostas.values()).filter((resposta) => resposta.resposta !== null).length
  const progresso = totalItens ? Math.round((totalRespondidos / totalItens) * 100) : 0

  const dataHoraFormatada = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(dataHoraInicio))
  const tipoLabel: Record<'base' | 'saida' | 'retorno', string> = { base: 'Checklist base', saida: 'Saída', retorno: 'Retorno' }

  function atualizarResposta(itemId: string, valor: RespostaEmEdicao) {
    setRespostas((prev) => new Map(prev).set(itemId, valor))
  }

  function marcarCategoriaComoOk() {
    if (!categoriaAtual) return
    setRespostas((prev) => {
      const novo = new Map(prev)
      categoriaAtual.checklist_items.forEach((item) => {
        const atual = novo.get(item.id) ?? { resposta: null, observacao: '', fotos: [] }
        if (!item.exige_foto && !item.item_critico) {
          novo.set(item.id, { ...atual, resposta: 'ok' })
        }
      })
      return novo
    })
  }

  const pendenciasCategoriaAtual = useMemo(() => {
    if (!categoriaAtual) return []
    return categoriaAtual.checklist_items.filter((item) => {
      const resposta = respostas.get(item.id)
      if (!resposta?.resposta) return true
      if ((item.exige_foto || resposta.resposta === 'nao_ok') && resposta.fotos.length === 0) return true
      if (resposta.resposta === 'nao_ok' && !resposta.observacao.trim()) return true
      return false
    })
  }, [categoriaAtual, respostas])

  const todasPendencias = useMemo(() => {
    const pendencias: string[] = []
    categorias.forEach((categoria) => {
      categoria.checklist_items.forEach((item) => {
        const resposta = respostas.get(item.id)
        if (!resposta?.resposta) pendencias.push(`${categoria.nome}: ${item.nome}`)
        else if ((item.exige_foto || resposta.resposta === 'nao_ok') && resposta.fotos.length === 0) pendencias.push(`${categoria.nome}: ${item.nome} — foto`)
        else if (resposta.resposta === 'nao_ok' && !resposta.observacao.trim()) pendencias.push(`${categoria.nome}: ${item.nome} — observação`)
      })
    })
    return pendencias
  }, [categorias, respostas])

  function proximaCategoria() {
    if (pendenciasCategoriaAtual.length > 0) {
      toastError(`Existem ${pendenciasCategoriaAtual.length} pendência(s) nessa etapa.`)
      return
    }
    setCategoriaAtualIndex((idx) => Math.min(idx + 1, totalCategorias - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function categoriaAnterior() {
    if (categoriaAtualIndex === 0) onVoltar()
    else {
      setCategoriaAtualIndex((idx) => Math.max(idx - 1, 0))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  async function finalizar() {
    if (todasPendencias.length > 0) {
      toastError(`Ainda existem ${todasPendencias.length} pendência(s). Revise antes de enviar.`)
      return
    }

    setFinalizando(true)
    try {
      const respostasPayload: RespostaItemInput[] = Array.from(respostas.entries()).map(([item_id, resposta]) => ({
        item_id,
        resposta: resposta.resposta,
        observacao: resposta.observacao || undefined,
        fotos: resposta.fotos.length > 0 ? resposta.fotos : undefined,
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

      success('Checklist enviado e sincronizado com o painel.')
      router.push(`/mobile/checklists/${resultado.checklistId}`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao finalizar checklist.')
      setFinalizando(false)
    }
  }

  if (!categoriaAtual) return null

  const ehUltimaCategoria = categoriaAtualIndex === totalCategorias - 1
  const itensCategoria = categoriaAtual.checklist_items
  const respondidosCategoria = itensCategoria.filter((item) => respostas.get(item.id)?.resposta).length

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <button onClick={categoriaAnterior} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-xs font-semibold text-slate-400">Etapa {categoriaAtualIndex + 1} de {totalCategorias}</p>
            <h1 className="truncate text-base font-bold text-slate-950">{categoriaAtual.nome}</h1>
          </div>
          <div className="h-10 w-10" />
        </div>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-500">
            <span>{totalRespondidos}/{totalItens} itens</span>
            <span>{progresso}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progresso}%` }} />
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 pb-28">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Dados automáticos</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl bg-slate-50 p-3"><Truck className="mb-1 h-4 w-4 text-blue-600" /><p className="font-bold text-slate-950">{veiculoResumo.placa}</p><p className="text-slate-500">{veiculoResumo.codigo_frota ? `Frota ${veiculoResumo.codigo_frota}` : 'Veículo'}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><Gauge className="mb-1 h-4 w-4 text-blue-600" /><p className="font-bold text-slate-950">{km.toLocaleString('pt-BR')}</p><p className="text-slate-500">KM informado</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><UserRound className="mb-1 h-4 w-4 text-blue-600" /><p className="truncate font-bold text-slate-950">{motoristaResumo?.nome ?? 'Não informado'}</p><p className="text-slate-500">{motoristaResumo?.matricula ? `Mat. ${motoristaResumo.matricula}` : 'Motorista'}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><CalendarClock className="mb-1 h-4 w-4 text-blue-600" /><p className="font-bold text-slate-950">{dataHoraFormatada}</p><p className="text-slate-500">{tipoLabel[tipo]}</p></div>
          </div>
        </section>

        <section className="rounded-3xl bg-blue-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-blue-950">{categoriaAtual.nome}</h2>
              {categoriaAtual.descricao && <p className="mt-1 text-sm text-blue-700/70">{categoriaAtual.descricao}</p>}
              <p className="mt-1 text-xs text-blue-700">{respondidosCategoria} de {itensCategoria.length} respondidos nessa etapa</p>
            </div>
            <button onClick={marcarCategoriaComoOk} className="shrink-0 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-blue-700 shadow-sm">
              OK nos simples
            </button>
          </div>
        </section>

        <div className="space-y-3">
          {itensCategoria.map((item, index) => (
            <MobileChecklistItem
              key={item.id}
              numero={index + 1}
              total={itensCategoria.length}
              item={item}
              valor={respostas.get(item.id) ?? { resposta: null, observacao: '', fotos: [] }}
              onChange={(valor) => atualizarResposta(item.id, valor)}
              pastaStorage={pastaStorage}
            />
          ))}
        </div>

        {ehUltimaCategoria && (
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="mb-2 block text-sm font-bold text-slate-800">Observações gerais</label>
            <textarea
              value={observacoesGerais}
              onChange={(e) => setObservacoesGerais(e.target.value)}
              rows={4}
              placeholder="Observação final sobre o checklist..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </section>
        )}

        {ehUltimaCategoria && todasPendencias.length > 0 && (
          <div className="rounded-3xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
            <div className="mb-1 flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> Pendências antes de enviar</div>
            <p>{todasPendencias.length} item(ns) ainda precisam de resposta, foto ou observação.</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
        {ehUltimaCategoria ? (
          <button
            onClick={finalizar}
            disabled={finalizando}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-green-600 text-sm font-bold text-white shadow-sm disabled:bg-slate-300"
          >
            {finalizando ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            {finalizando ? 'Enviando...' : 'Finalizar e sincronizar'}
          </button>
        ) : (
          <button onClick={proximaCategoria} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-sm">
            Próxima etapa
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}
