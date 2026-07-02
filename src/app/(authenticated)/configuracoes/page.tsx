import { listarEmpresas, listarUnidades } from '@/lib/actions/empresas'
import { Header } from '@/components/layout/Header'
import { ConfiguracoesCliente } from './ConfiguracoesCliente'

export default async function ConfiguracoesPage() {
  const [empresas, unidades] = await Promise.all([
    listarEmpresas().catch(() => []),
    listarUnidades().catch(() => []),
  ])

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Configurações" subtitle="Empresas, unidades e parâmetros do sistema" />
      <ConfiguracoesCliente empresas={empresas as never} unidades={unidades as never} />
    </div>
  )
}
