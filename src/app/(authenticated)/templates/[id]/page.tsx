import { buscarTemplateCompleto } from '@/lib/actions/templates'
import { Header } from '@/components/layout/Header'
import { TemplateEditorCliente } from './TemplateEditorCliente'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TemplateDetalhePage({ params }: Props) {
  const { id } = await params

  const dados = await buscarTemplateCompleto(id).catch(() => null)
  if (!dados) notFound()

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title={dados.template.nome}
        subtitle={dados.template.descricao ?? 'Editor de template de checklist'}
      />
      <TemplateEditorCliente dados={dados as never} />
    </div>
  )
}
