import { buscarVeiculo } from '@/lib/actions/veiculos'
import { listarEmpresas, listarUnidades } from '@/lib/actions/empresas'
import { listarMotoristas } from '@/lib/actions/motoristas'
import { Header } from '@/components/layout/Header'
import { VeiculoDetalheCliente } from './VeiculoDetalheCliente'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function VeiculoDetalhePage({ params }: Props) {
  const { id } = await params

  const [veiculoData, empresas, unidades, motoristas] = await Promise.all([
    buscarVeiculo(id).catch(() => null),
    listarEmpresas().catch(() => []),
    listarUnidades().catch(() => []),
    listarMotoristas({ status: 'ativo' }).catch(() => []),
  ])

  if (!veiculoData) notFound()

  const veiculo = veiculoData as {
    id: string; placa: string; fabricante: string | null; modelo: string | null; ano: number | null
    [key: string]: unknown
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title={veiculo.placa}
        subtitle={[veiculo.fabricante, veiculo.modelo, veiculo.ano].filter(Boolean).join(' · ')}
      />
      <VeiculoDetalheCliente
        veiculo={veiculoData as never}
        empresas={empresas as never}
        unidades={unidades as never}
        motoristas={motoristas as never}
      />
    </div>
  )
}
