import { listarVeiculos } from '@/lib/actions/veiculos'
import { listarEmpresas } from '@/lib/actions/empresas'
import { listarUnidades } from '@/lib/actions/empresas'
import { Header } from '@/components/layout/Header'
import { VeiculosCliente } from './VeiculosCliente'

export default async function VeiculosPage() {
  const [veiculos, empresas, unidades] = await Promise.all([
    listarVeiculos(),
    listarEmpresas(),
    listarUnidades(),
  ]).catch(() => [[], [], []])

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Veículos"
        subtitle={`${(veiculos as unknown[]).length} veículo(s) cadastrado(s)`}
      />
      <VeiculosCliente
        veiculosIniciais={veiculos as never}
        empresas={empresas as never}
        unidades={unidades as never}
      />
    </div>
  )
}
