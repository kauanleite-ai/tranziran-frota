import { listarChecklists, listarVeiculosSemChecklistBase } from '@/lib/actions/checklists'
import { Header } from '@/components/layout/Header'
import { ChecklistsCliente } from './ChecklistsCliente'

export default async function ChecklistsPage() {
  const [checklists, veiculosPendentes] = await Promise.all([
    listarChecklists().catch(() => []),
    listarVeiculosSemChecklistBase().catch(() => []),
  ])

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Checklists"
        subtitle={`${checklists.length} checklist(s) registrado(s)`}
      />
      <ChecklistsCliente
        checklistsIniciais={checklists as never}
        veiculosPendentes={veiculosPendentes as never}
      />
    </div>
  )
}
