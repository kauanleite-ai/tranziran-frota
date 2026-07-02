import { listarVeiculos } from '@/lib/actions/veiculos'
import { listarMotoristas } from '@/lib/actions/motoristas'
import { Header } from '@/components/layout/Header'
import { NovoChecklistCliente } from './NovoChecklistCliente'

interface Props {
  searchParams: Promise<{ veiculo?: string }>
}

export default async function NovoChecklistPage({ searchParams }: Props) {
  const { veiculo } = await searchParams

  const [veiculos, motoristas] = await Promise.all([
    listarVeiculos().catch(() => []),
    listarMotoristas({ status: 'ativo' }).catch(() => []),
  ])

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Novo Checklist" subtitle="Selecione o veículo para iniciar o preenchimento" />
      <NovoChecklistCliente
        veiculos={veiculos as never}
        motoristas={motoristas as never}
        veiculoPreSelecionado={veiculo}
      />
    </div>
  )
}
