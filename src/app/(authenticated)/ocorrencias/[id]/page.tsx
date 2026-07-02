import { buscarOcorrencia } from '@/lib/actions/ocorrencias'
import { Header } from '@/components/layout/Header'
import { OcorrenciaDetalheCliente } from './OcorrenciaDetalheCliente'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function OcorrenciaDetalhePage({ params }: Props) {
  const { id } = await params
  const dados = await buscarOcorrencia(id).catch(() => null)
  if (!dados) notFound()

  const placa = (dados.ocorrencia.veiculos as unknown as { placa: string } | null)?.placa

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title={`Ocorrência #${dados.ocorrencia.numero}`}
        subtitle={placa ? `Veículo ${placa}` : 'Detalhes e tratamento'}
      />
      <OcorrenciaDetalheCliente dados={dados as never} />
    </div>
  )
}
