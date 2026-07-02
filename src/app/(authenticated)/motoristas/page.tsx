import { listarMotoristas } from '@/lib/actions/motoristas'
import { listarEmpresas, listarUnidades } from '@/lib/actions/empresas'
import { Header } from '@/components/layout/Header'
import { MotoristasCliente } from './MotoristasCliente'

export default async function MotoristasPage() {
  const [motoristas, empresas, unidades] = await Promise.all([
    listarMotoristas(),
    listarEmpresas(),
    listarUnidades(),
  ]).catch(() => [[], [], []])

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Motoristas"
        subtitle={`${(motoristas as unknown[]).length} motorista(s) cadastrado(s)`}
      />
      <MotoristasCliente
        motoristasIniciais={motoristas as never}
        empresas={empresas as never}
        unidades={unidades as never}
      />
    </div>
  )
}
