'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Send, Truck, Wrench } from 'lucide-react'
import { registrarDevolutivaManutencao, type AcaoDevolutivaManutencao } from '@/lib/actions/manutencao-publica'
import { Button } from '@/components/ui/Button'

const OPCOES: Array<{ value: AcaoDevolutivaManutencao; label: string; descricao: string }> = [
  { value: 'em_analise', label: 'Em análise pela manutenção', descricao: 'A manutenção recebeu e está avaliando a ocorrência.' },
  { value: 'solicitar_oficina', label: 'Solicitar envio para oficina', descricao: 'Orientar a Frota a levar o veículo para atendimento.' },
  { value: 'em_oficina', label: 'Veículo já está em oficina', descricao: 'Registrar que o veículo já está em atendimento.' },
  { value: 'resolvido', label: 'Problema resolvido', descricao: 'Informar que a manutenção concluiu a tratativa e aguarda validação da Frota.' },
  { value: 'mais_informacoes', label: 'Solicitar mais informações', descricao: 'Pedir complemento, nova foto ou detalhamento do problema.' },
]

type Props = {
  token: string
  dados: {
    ocorrencia: {
      id: string
      numero: number
      descricao: string
      gravidade: string
      status: string
      status_tratativa: string
      criado_em: string
      veiculos: { placa: string; codigo_frota: string | null; tipo: string; fabricante: string | null; modelo: string | null } | null
      checklist_items: { nome: string; checklist_categorias: { nome: string } | null } | null
    }
    fotos: Array<{ id: string; nome_original: string; url: string }>
  }
}

export function ManutencaoDevolutivaCliente({ token, dados }: Props) {
  const router = useRouter()
  const { ocorrencia, fotos } = dados
  const [acao, setAcao] = useState<AcaoDevolutivaManutencao>('em_analise')
  const [observacao, setObservacao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [finalizado, setFinalizado] = useState(false)
  const veiculo = ocorrencia.veiculos
  const item = ocorrencia.checklist_items

  async function enviar() {
    if (!observacao.trim()) {
      alert('Descreva a devolutiva da manutenção antes de enviar.')
      return
    }
    setEnviando(true)
    try {
      await registrarDevolutivaManutencao({ token, acao, observacao })
      setFinalizado(true)
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao registrar devolutiva.')
    } finally {
      setEnviando(false)
    }
  }

  if (finalizado) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-xl rounded-3xl border border-emerald-100 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-950">Devolutiva registrada</h1>
          <p className="mt-2 text-sm text-slate-500">A ocorrência foi atualizada no sistema da Frota.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <div className="mx-auto max-w-2xl space-y-4">
        <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600">
              <Wrench className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Manutenção</p>
              <h1 className="text-xl font-bold">Ocorrência OC-{ocorrencia.numero}</h1>
              <p className="text-sm text-slate-300">Registre a devolutiva técnica para a Frota.</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-950">{item?.nome ?? 'Item não informado'}</h2>
              <p className="text-xs text-slate-500">{item?.checklist_categorias?.nome ?? 'Categoria não informada'}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-400">Veículo</p>
              <p className="font-mono text-lg font-bold text-slate-950">{veiculo?.placa ?? '—'}</p>
              <p className="text-xs text-slate-500">{veiculo?.codigo_frota ? `Frota ${veiculo.codigo_frota}` : 'Sem frota informada'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-400">Status atual</p>
              <p className="font-bold text-slate-950">{ocorrencia.status_tratativa.replaceAll('_', ' ')}</p>
              <p className="flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3 w-3" /> Aberta em {new Date(ocorrencia.criado_em).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-red-50 p-3">
            <p className="text-xs font-semibold uppercase text-red-500">Descrição da não conformidade</p>
            <p className="mt-1 text-sm font-medium text-red-950">{ocorrencia.descricao}</p>
          </div>
        </section>

        {fotos.length > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-bold text-slate-950">Fotos da ocorrência</h2>
            <div className="grid grid-cols-2 gap-3">
              {fotos.map((foto, index) => (
                <a key={foto.id} href={foto.url} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foto.url} alt={foto.nome_original || `Foto ${index + 1}`} className="aspect-square w-full object-cover" />
                  <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-600">
                    Foto {index + 1}<ExternalLink className="h-3 w-3" />
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-950">Devolutiva</h2>
          <div className="mt-3 space-y-2">
            {OPCOES.map((opcao) => (
              <label key={opcao.value} className={`block rounded-2xl border p-3 ${acao === opcao.value ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}>
                <input type="radio" name="acao" value={opcao.value} checked={acao === opcao.value} onChange={() => setAcao(opcao.value)} className="mr-2" />
                <span className="font-bold text-slate-900">{opcao.label}</span>
                <p className="ml-6 text-xs text-slate-500">{opcao.descricao}</p>
              </label>
            ))}
          </div>

          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-bold text-slate-700">Observação da manutenção</span>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={5}
              placeholder="Ex.: Favor encaminhar veículo para oficina amanhã cedo para análise do sistema de rádio."
              className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <Button onClick={enviar} disabled={enviando} className="mt-4 w-full justify-center">
            {enviando ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar devolutiva
          </Button>
        </section>

        <p className="flex items-center justify-center gap-2 text-center text-xs text-slate-400">
          <Truck className="h-3 w-3" /> Tranziran Frota & Auditoria
        </p>
      </div>
    </main>
  )
}
