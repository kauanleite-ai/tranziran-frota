import Link from 'next/link'
import { CheckCircle2, ClipboardList, Gauge, Truck, UserRound } from 'lucide-react'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { buscarChecklistCompleto } from '@/lib/actions/checklists'

const respostaLabel: Record<string, string> = {
  ok: 'OK',
  nao_tem: 'Não tem',
  nao_ok: 'Não está OK',
  nao_aplica: 'N/A',
}

const tipoLabel: Record<string, string> = { base: 'Checklist base', saida: 'Saída', retorno: 'Retorno' }

interface Props { params: Promise<{ id: string }> }

export default async function MobileChecklistDetalhePage({ params }: Props) {
  const { id } = await params
  const { checklist, respostas } = await buscarChecklistCompleto(id)
  const veiculo = Array.isArray(checklist.veiculos) ? checklist.veiculos[0] : checklist.veiculos
  const motorista = Array.isArray(checklist.motoristas) ? checklist.motoristas[0] : checklist.motoristas

  const naoOk = respostas.filter((resposta) => resposta.resposta === 'nao_ok').length

  return (
    <div className="flex min-h-screen flex-col">
      <MobileHeader title="Checklist enviado" subtitle="Sincronizado com o painel" backHref="/mobile/historico" />
      <div className="space-y-4 p-4 pb-24">
        <section className="rounded-3xl bg-green-600 p-5 text-white shadow-sm">
          <CheckCircle2 className="mb-3 h-10 w-10" />
          <h2 className="text-xl font-bold">Checklist sincronizado</h2>
          <p className="mt-1 text-sm text-green-50">As informações já estão disponíveis no painel administrativo.</p>
        </section>

        <section className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl border border-slate-200 bg-white p-3"><Truck className="mb-1 h-4 w-4 text-blue-600" /><p className="font-mono text-base font-bold text-slate-950">{veiculo?.placa ?? '-'}</p><p className="text-slate-500">Veículo</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3"><Gauge className="mb-1 h-4 w-4 text-blue-600" /><p className="text-base font-bold text-slate-950">{checklist.km != null ? Number(checklist.km).toLocaleString('pt-BR') : '-'}</p><p className="text-slate-500">KM</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3"><UserRound className="mb-1 h-4 w-4 text-blue-600" /><p className="truncate text-sm font-bold text-slate-950">{motorista?.nome ?? 'Não informado'}</p><p className="text-slate-500">Motorista</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3"><ClipboardList className="mb-1 h-4 w-4 text-blue-600" /><p className="text-sm font-bold text-slate-950">{tipoLabel[checklist.tipo] ?? checklist.tipo}</p><p className="text-slate-500">Tipo</p></div>
        </section>

        {naoOk > 0 && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-bold">{naoOk} item(ns) com problema</p>
            <p className="mt-1">O sistema abriu ocorrência automática para os itens marcados como Não está OK.</p>
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-900">Resumo das respostas</h3>
          <div className="space-y-2">
            {respostas.slice(0, 25).map((resposta) => {
              const item = Array.isArray(resposta.checklist_items) ? resposta.checklist_items[0] : resposta.checklist_items
              return (
                <div key={resposta.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate font-medium text-slate-700">{item?.nome ?? 'Item'}</span>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${resposta.resposta === 'nao_ok' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>
                    {respostaLabel[resposta.resposta] ?? resposta.resposta}
                  </span>
                </div>
              )
            })}
            {respostas.length > 25 && <p className="pt-2 text-center text-xs text-slate-400">+ {respostas.length - 25} respostas no painel completo</p>}
          </div>
        </section>

        <Link href={`/checklists/${checklist.id}`} className="block rounded-2xl bg-slate-900 px-4 py-4 text-center text-sm font-bold text-white">
          Abrir no painel administrativo
        </Link>
        <Link href="/mobile/checklists/novo" className="block rounded-2xl bg-blue-600 px-4 py-4 text-center text-sm font-bold text-white">
          Iniciar outro checklist
        </Link>
      </div>
    </div>
  )
}
