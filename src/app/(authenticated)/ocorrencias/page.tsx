import { listarOcorrencias, contadoresOcorrencias } from '@/lib/actions/ocorrencias'
import { Header } from '@/components/layout/Header'
import { OcorrenciasCliente } from './OcorrenciasCliente'

export default async function OcorrenciasPage() {
  const [ocorrencias, contadores] = await Promise.all([
    listarOcorrencias().catch(() => []),
    contadoresOcorrencias().catch(() => ({ abertas: 0, criticas: 0, emAnalise: 0, aguardando: 0 })),
  ])

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Ocorrências"
        subtitle={`${contadores.abertas} aberta(s) · ${contadores.criticas} crítica(s)`}
      />
      <OcorrenciasCliente
        ocorrenciasIniciais={ocorrencias as never}
        contadores={contadores}
      />
    </div>
  )
}
