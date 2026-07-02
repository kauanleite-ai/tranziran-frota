import { Header } from '@/components/layout/Header'
import { RealizarAuditoriaCliente } from './RealizarAuditoriaCliente'
import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{ agendamento?: string }>
}

export default async function RealizarAuditoriaPage({ searchParams }: Props) {
  const { agendamento } = await searchParams

  if (!agendamento) redirect('/auditorias')

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Realizar Auditoria"
        subtitle="Verificação quinzenal do estado do veículo"
      />
      <RealizarAuditoriaCliente agendamentoId={agendamento} />
    </div>
  )
}
