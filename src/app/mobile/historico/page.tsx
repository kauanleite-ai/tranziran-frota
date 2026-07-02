import Link from 'next/link'
import { CalendarClock, ClipboardCheck, Gauge, Truck } from 'lucide-react'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { listarChecklists } from '@/lib/actions/checklists'

const tipoLabel: Record<string, string> = { base: 'Checklist base', saida: 'Saída', retorno: 'Retorno' }

export default async function MobileHistoricoPage() {
  const checklists = await listarChecklists().catch(() => [])

  return (
    <div className="flex min-h-screen flex-col">
      <MobileHeader title="Histórico" subtitle="Últimos checklists enviados" backHref="/mobile" />
      <div className="space-y-3 p-4 pb-20">
        {checklists.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <ClipboardCheck className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Nenhum checklist enviado ainda</p>
            <p className="mt-1 text-xs text-slate-400">Quando o conferente finalizar pelo celular, aparecerá aqui.</p>
          </div>
        ) : (
          checklists.map((checklist) => {
            const veiculo = Array.isArray(checklist.veiculos) ? checklist.veiculos[0] : checklist.veiculos
            const motorista = Array.isArray(checklist.motoristas) ? checklist.motoristas[0] : checklist.motoristas
            const data = checklist.data_conclusao || checklist.data_inicio
            return (
              <Link
                key={checklist.id}
                href={`/mobile/checklists/${checklist.id}`}
                className="block rounded-3xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-base font-bold text-slate-950">{veiculo?.placa ?? 'Sem placa'}</p>
                      <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-bold text-green-700">Sincronizado</span>
                    </div>
                    <p className="text-sm font-medium text-slate-700">{tipoLabel[checklist.tipo] ?? checklist.tipo}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      {data && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> {new Date(data).toLocaleString('pt-BR')}</span>}
                      {checklist.km != null && <span className="inline-flex items-center gap-1"><Gauge className="h-3.5 w-3.5" /> {Number(checklist.km).toLocaleString('pt-BR')} km</span>}
                    </div>
                    {motorista?.nome && <p className="mt-1 truncate text-xs text-slate-400">Motorista: {motorista.nome}</p>}
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
