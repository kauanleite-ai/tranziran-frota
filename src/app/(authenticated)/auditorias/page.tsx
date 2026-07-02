import { listarAgendamentos, listarAuditorias } from '@/lib/actions/auditorias'
import { Header } from '@/components/layout/Header'
import { AuditoriasCliente } from './AuditoriasCliente'

export default async function AuditoriasPage() {
  const [agendamentos, historico] = await Promise.all([
    listarAgendamentos().catch(() => []),
    listarAuditorias().catch(() => []),
  ])

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Auditorias"
        subtitle="Quinzenais por veículo"
      />
      <AuditoriasCliente
        agendamentosIniciais={agendamentos as never}
        historicoIniciais={historico as never}
      />
    </div>
  )
}
