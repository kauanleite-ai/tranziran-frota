'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Ban, AlertCircle, MinusCircle, ImageIcon, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { TIPO_CHECKLIST_LABEL } from '@/lib/constants'
import { formatarDataHora } from '@/utils'
import { obterUrlFotoAsync } from '@/lib/storage'

type Resposta = {
  id: string; resposta: string | null; observacao: string | null
  gera_ocorrencia: boolean; ocorrencia_id: string | null
  checklist_items: {
    id: string; nome: string; categoria_id: string; item_critico: boolean
    checklist_categorias: { nome: string } | null
  } | null
  checklist_fotos: { id: string; storage_path: string; nome_original: string }[]
}

type ChecklistInfo = {
  id: string; tipo: string; status: string; km: number | null
  observacoes_gerais: string | null; data_inicio: string; data_conclusao: string | null
  veiculos: { id: string; placa: string; codigo_frota: string | null; fabricante: string | null; modelo: string | null } | null
  motoristas: { id: string; nome: string; matricula: string } | null
}

interface Props {
  dados: { checklist: ChecklistInfo; respostas: Resposta[] }
}

const statusConfig: Record<string, { icon: typeof Check; label: string; cor: string }> = {
  ok: { icon: Check, label: 'OK', cor: 'text-green-600 bg-green-50' },
  nao_tem: { icon: MinusCircle, label: 'Não tem', cor: 'text-slate-600 bg-slate-50' },
  nao_ok: { icon: AlertCircle, label: 'Não OK', cor: 'text-red-600 bg-red-50' },
  nao_aplica: { icon: Ban, label: 'N/A', cor: 'text-slate-400 bg-slate-50' },
}

export function ChecklistDetalheCliente({ dados }: Props) {
  const router = useRouter()
  const { checklist, respostas } = dados

  const categorias = new Map<string, Resposta[]>()
  respostas.forEach((r) => {
    const nomeCategoria = r.checklist_items?.checklist_categorias?.nome ?? 'Sem categoria'
    if (!categorias.has(nomeCategoria)) categorias.set(nomeCategoria, [])
    categorias.get(nomeCategoria)!.push(r)
  })

  const totalNaoOk = respostas.filter((r) => r.resposta === 'nao_ok').length

  return (
    <div className="flex-1 p-6 space-y-5">
      <button
        onClick={() => router.push('/checklists')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para checklists
      </button>

      <Card>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 font-mono">
                {checklist.veiculos?.placa ?? '—'}
              </h2>
              <Badge variant="purple">
                {TIPO_CHECKLIST_LABEL[checklist.tipo as keyof typeof TIPO_CHECKLIST_LABEL] ?? checklist.tipo}
              </Badge>
              <Badge variant="green">
                <CheckCircle2 className="w-3 h-3 mr-0.5" />
                Concluído
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {[checklist.veiculos?.fabricante, checklist.veiculos?.modelo].filter(Boolean).join(' ')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Concluído em</p>
            <p className="text-sm font-medium text-slate-700">
              {formatarDataHora(checklist.data_conclusao)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-100">
          {[
            { label: 'Motorista', value: checklist.motoristas?.nome ?? '—' },
            { label: 'KM', value: checklist.km ? checklist.km.toLocaleString('pt-BR') : '—' },
            { label: 'Total de itens', value: respostas.length },
            { label: 'Não conformes', value: totalNaoOk },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs text-slate-400 font-medium">{item.label}</p>
              <p className={`text-sm font-semibold mt-0.5 ${item.label === 'Não conformes' && Number(item.value) > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {checklist.observacoes_gerais && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-medium mb-1">Observações gerais</p>
            <p className="text-sm text-slate-600">{checklist.observacoes_gerais}</p>
          </div>
        )}
      </Card>

      {Array.from(categorias.entries()).map(([nomeCategoria, itens]) => (
        <Card key={nomeCategoria} padding="none">
          <div className="p-4 border-b border-slate-100">
            <CardHeader title={nomeCategoria} className="mb-0" />
          </div>
          <div className="divide-y divide-slate-50">
            {itens.map((r) => (
              <RespostaLinha key={r.id} resposta={r} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

function RespostaLinha({ resposta }: { resposta: Resposta }) {
  const config = resposta.resposta ? statusConfig[resposta.resposta] : null
  const Icon = config?.icon ?? MinusCircle
  const [urls, setUrls] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    let ativo = true
    async function carregar() {
      const novosUrls = new Map<string, string>()
      for (const foto of resposta.checklist_fotos) {
        const url = await obterUrlFotoAsync('checklist-fotos', foto.storage_path)
        if (url) novosUrls.set(foto.id, url)
      }
      if (ativo) setUrls(novosUrls)
    }
    if (resposta.checklist_fotos.length > 0) carregar()
    return () => { ativo = false }
  }, [resposta.checklist_fotos])

  return (
    <div className="p-3.5 flex items-start gap-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${config?.cor ?? 'bg-slate-50 text-slate-400'}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-800">{resposta.checklist_items?.nome ?? '—'}</p>
          {resposta.checklist_items?.item_critico && (
            <Badge variant="red">Crítico</Badge>
          )}
          {resposta.gera_ocorrencia && (
            <Badge variant="orange">Ocorrência aberta</Badge>
          )}
        </div>
        {resposta.observacao && (
          <p className="text-xs text-slate-500 mt-1">{resposta.observacao}</p>
        )}
        {resposta.checklist_fotos.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            {resposta.checklist_fotos.map((foto) => {
              const url = urls.get(foto.id)
              return (
                <a
                  key={foto.id}
                  href={url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0"
                >
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={foto.nome_original} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-slate-300" />
                  )}
                </a>
              )
            })}
          </div>
        )}
      </div>
      <span className="text-xs font-semibold text-slate-400 shrink-0">{config?.label ?? '—'}</span>
    </div>
  )
}
