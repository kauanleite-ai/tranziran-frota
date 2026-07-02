import { buscarChecklistCompleto } from '@/lib/actions/checklists'
import { Header } from '@/components/layout/Header'
import { ChecklistDetalheCliente } from './ChecklistDetalheCliente'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ChecklistDetalhePage({ params }: Props) {
  const { id } = await params

  const dados = await buscarChecklistCompleto(id).catch(() => null)
  if (!dados) notFound()

  const veiculo = dados.checklist.veiculos as unknown as { placa: string } | null

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title={`Checklist — ${veiculo?.placa ?? '—'}`}
        subtitle="Registro concluído"
      />
      <ChecklistDetalheCliente dados={dados as never} />
    </div>
  )
}
