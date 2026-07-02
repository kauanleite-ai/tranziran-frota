import { listarTemplates } from '@/lib/actions/templates'
import { Header } from '@/components/layout/Header'
import { TemplatesCliente } from './TemplatesCliente'

export default async function TemplatesPage() {
  const templates = await listarTemplates().catch(() => [])

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Templates de Checklist"
        subtitle={`${templates.length} template(s) cadastrado(s)`}
      />
      <TemplatesCliente templatesIniciais={templates as never} />
    </div>
  )
}
