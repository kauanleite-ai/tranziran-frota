'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatarDataHora } from '@/utils'
import { TIPO_VEICULO_LABEL } from '@/lib/constants'

type Resposta = {
  id: string; continua_igual: boolean | null; resposta_nova: string | null
  observacao: string | null; gera_ocorrencia: boolean; ocorrencia_id: string | null
  checklist_items: {
    id: string; nome: string; item_critico: boolean
    checklist_categorias: { nome: string } | null
  } | null
  checklist_fotos: { id: string; storage_path: string; nome_original: string }[]
}

type AuditoriaInfo = {
  id: string; status: string; km: number | null; observacoes_gerais: string | null
  data_inicio: string; data_conclusao: string | null
  veiculos: { id: string; placa: string; codigo_frota: string | null; tipo: string; fabricante: string | null; modelo: string | null } | null
  motoristas: { id: string; nome: string; matricula: string } | null
}

interface Props {
  dados: { auditoria: AuditoriaInfo; respostas: Resposta[] }
}

const RESPOSTA_LABEL: Record<string, string> = {
  ok: 'OK', nao_tem: 'Não tem', nao_ok: 'Não OK', nao_aplica: 'N/A',
}

export function AuditoriaDetalheCliente({ dados }: Props) {
  const router = useRouter()
  const { auditoria, respostas } = dados

  const totalIguais = respostas.filter((r) => r.continua_igual === true).length
  const totalAlterados = respostas.filter((r) => r.continua_igual === false).length

  // Agrupa por categoria
  const categorias = new Map<string, Resposta[]>()
  respostas.forEach((r) => {
    const nome = r.checklist_items?.checklist_categorias?.nome ?? 'Sem categoria'
    if (!categorias.has(nome)) categorias.set(nome, [])
    categorias.get(nome)!.push(r)
  })

  return (
    <div className="flex-1 p-6 space-y-5">
      <button
        onClick={() => router.push('/auditorias')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para auditorias
      </button>

      {/* Resumo */}
      <Card>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 font-mono">
                {auditoria.veiculos?.placa ?? '—'}
              </h2>
              <Badge variant={auditoria.status === 'concluida' ? 'green' : 'yellow'}>
                <CheckCircle2 className="w-3 h-3 mr-0.5" />
                {auditoria.status === 'concluida' ? 'Concluída' : 'Em andamento'}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {TIPO_VEICULO_LABEL[auditoria.veiculos?.tipo as keyof typeof TIPO_VEICULO_LABEL] ?? '—'}
              {[auditoria.veiculos?.fabricante, auditoria.veiculos?.modelo]
                .filter(Boolean).length > 0 && ' · '}
              {[auditoria.veiculos?.fabricante, auditoria.veiculos?.modelo].filter(Boolean).join(' ')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Realizada em</p>
            <p className="text-sm font-medium text-slate-700">
              {formatarDataHora(auditoria.data_conclusao)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-5 pt-4 border-t border-slate-100">
          {[
            { label: 'Motorista', value: auditoria.motoristas?.nome ?? '—' },
            { label: 'KM', value: auditoria.km ? auditoria.km.toLocaleString('pt-BR') : '—' },
            { label: 'Total verificado', value: respostas.length },
            { label: 'Continuaram iguais', value: totalIguais, cor: 'text-green-600' },
            { label: 'Alterados', value: totalAlterados, cor: totalAlterados > 0 ? 'text-orange-600' : 'text-slate-800' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs text-slate-400 font-medium">{item.label}</p>
              <p className={`text-sm font-semibold mt-0.5 ${item.cor ?? 'text-slate-800'}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {auditoria.observacoes_gerais && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-medium mb-1">Observações gerais</p>
            <p className="text-sm text-slate-600">{auditoria.observacoes_gerais}</p>
          </div>
        )}
      </Card>

      {/* Itens alterados — destaque */}
      {totalAlterados > 0 && (
        <Card>
          <CardHeader
            title="Itens com alteração"
            description="Itens cujo estado mudou nesta auditoria"
          />
          <div className="divide-y divide-slate-50">
            {respostas
              .filter((r) => r.continua_igual === false)
              .map((r) => (
                <div key={r.id} className="flex items-start gap-3 py-3">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center shrink-0 mt-0.5">
                    <RefreshCw className="w-3.5 h-3.5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-800">{r.checklist_items?.nome}</p>
                      {r.checklist_items?.item_critico && <Badge variant="red">Crítico</Badge>}
                      {r.gera_ocorrencia && <Badge variant="orange">Ocorrência aberta</Badge>}
                    </div>
                    {r.resposta_nova && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Novo estado: <span className={`font-semibold ${r.resposta_nova === 'nao_ok' ? 'text-red-600' : 'text-slate-700'}`}>
                          {RESPOSTA_LABEL[r.resposta_nova]}
                        </span>
                      </p>
                    )}
                    {r.observacao && (
                      <p className="text-xs text-slate-400 mt-0.5 italic">&ldquo;{r.observacao}&rdquo;</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Resumo por categoria */}
      {Array.from(categorias.entries()).map(([nomeCategoria, itens]) => (
        <Card key={nomeCategoria} padding="none">
          <div className="p-4 border-b border-slate-100">
            <CardHeader title={nomeCategoria} className="mb-0" />
          </div>
          <div className="divide-y divide-slate-50">
            {itens.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  r.continua_igual ? 'bg-green-100' : 'bg-orange-100'
                }`}>
                  {r.continua_igual ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
                  )}
                </div>
                <p className="text-sm text-slate-700 flex-1 min-w-0 truncate">
                  {r.checklist_items?.nome ?? '—'}
                </p>
                <span className="text-xs text-slate-400 shrink-0">
                  {r.continua_igual ? 'Igual' : RESPOSTA_LABEL[r.resposta_nova ?? ''] ?? 'Alterado'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
