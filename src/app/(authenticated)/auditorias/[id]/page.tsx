import { buscarAuditoriaCompleta } from '@/lib/actions/auditorias'
import { Header } from '@/components/layout/Header'
import { AuditoriaDetalheCliente } from './AuditoriaDetalheCliente'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AuditoriaDetalhePage({ params }: Props) {
  const { id } = await params
  const dados = await buscarAuditoriaCompleta(id).catch(() => null)
  if (!dados) notFound()

  const veiculo = dados.auditoria.veiculos as unknown as { placa: string } | null

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title={`Auditoria — ${veiculo?.placa ?? '—'}`}
        subtitle="Registro da verificação quinzenal"
      />
      <AuditoriaDetalheCliente dados={dados as never} />
    </div>
  )
}
