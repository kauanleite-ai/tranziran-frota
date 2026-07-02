import { MobileHeader } from '@/components/mobile/MobileHeader'
import { MobileChecklistClient } from '@/components/mobile/MobileChecklistClient'
import { listarMotoristas } from '@/lib/actions/motoristas'
import { listarVeiculos } from '@/lib/actions/veiculos'

interface Props {
  searchParams: Promise<{ veiculo?: string }>
}

export default async function MobileNovoChecklistPage({ searchParams }: Props) {
  const { veiculo } = await searchParams
  const [veiculos, motoristas] = await Promise.all([
    listarVeiculos({ status: 'ativo' }).catch(() => []),
    listarMotoristas({ status: 'ativo' }).catch(() => []),
  ])

  return (
    <div className="flex min-h-screen flex-col">
      <MobileHeader title="Novo checklist" subtitle="Preenchimento pelo celular" backHref="/mobile" />
      <MobileChecklistClient
        veiculos={veiculos as never}
        motoristas={motoristas as never}
        veiculoPreSelecionado={veiculo}
      />
    </div>
  )
}
