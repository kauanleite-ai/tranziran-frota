import { buscarOcorrenciaPorToken } from '@/lib/actions/manutencao-publica'
import { ManutencaoDevolutivaCliente } from './ManutencaoDevolutivaCliente'
import { AlertTriangle } from 'lucide-react'

interface Props {
  params: Promise<{ token: string }>
}

export default async function ManutencaoOcorrenciaPage({ params }: Props) {
  const { token } = await params
  const dados = await buscarOcorrenciaPorToken(token).catch((error) => ({ erro: error instanceof Error ? error.message : 'Link inválido.' }))

  if ('erro' in dados) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-100 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-950">Não foi possível abrir a ocorrência</h1>
          <p className="mt-2 text-sm text-slate-500">{dados.erro}</p>
        </div>
      </main>
    )
  }

  return <ManutencaoDevolutivaCliente token={token} dados={dados as never} />
}
