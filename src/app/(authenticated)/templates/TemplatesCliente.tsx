'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ListChecks, ChevronRight, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { criarTemplate } from '@/lib/actions/templates'
import { formatarData } from '@/utils'

type TemplateVersao = { id: string; versao: number; publicado: boolean }
type Template = {
  id: string; nome: string; descricao: string | null; ativo: boolean
  versao_atual_id: string | null; criado_em: string
  checklist_template_versions: TemplateVersao[]
}

interface Props {
  templatesIniciais: Template[]
}

export function TemplatesCliente({ templatesIniciais }: Props) {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const [modalCriar, setModalCriar] = useState(false)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCriar() {
    if (!nome.trim()) return toastError('Informe o nome do template.')
    setLoading(true)
    try {
      const template = await criarTemplate(nome, descricao)
      success('Template criado! Agora adicione categorias e itens.')
      setModalCriar(false)
      setNome('')
      setDescricao('')
      router.push(`/templates/${template.id}`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao criar template.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Templates definem a estrutura dinâmica dos checklists: categorias, itens, regras de foto e criticidade.
        </p>
        <Button onClick={() => setModalCriar(true)}>
          <Plus className="w-4 h-4" />
          Novo template
        </Button>
      </div>

      {templatesIniciais.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <ListChecks className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium text-sm">Nenhum template cadastrado</p>
            <p className="text-slate-400 text-xs mt-1 mb-4">
              Crie o primeiro template para começar a estruturar os checklists
            </p>
            <Button size="sm" onClick={() => setModalCriar(true)}>
              <Plus className="w-4 h-4" />
              Criar template
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templatesIniciais.map((t) => {
            const versaoAtual = t.checklist_template_versions?.find((v) => v.id === t.versao_atual_id)
            const publicado = versaoAtual?.publicado ?? false

            return (
              <Card
                key={t.id}
                className="cursor-pointer hover:border-slate-300 hover:shadow transition-all"
                onClick={() => router.push(`/templates/${t.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                      <ListChecks className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">{t.nome}</h3>
                      {t.descricao && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t.descricao}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={t.ativo ? 'green' : 'gray'}>
                          {t.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {versaoAtual && (
                          <Badge variant={publicado ? 'blue' : 'yellow'}>
                            v{versaoAtual.versao} {publicado ? '· Publicado' : '· Rascunho'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </div>
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
                  {publicado ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-300" />
                  )}
                  Criado em {formatarData(t.criado_em)}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal criar */}
      <Modal
        open={modalCriar}
        onClose={() => setModalCriar(false)}
        title="Novo Template de Checklist"
        description="Defina o nome e a descrição inicial do template"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nome do template"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Checklist Frota Padrão"
            required
          />
          <Input
            label="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Breve descrição do propósito deste template"
          />
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setModalCriar(false)}>Cancelar</Button>
            <Button onClick={handleCriar} loading={loading}>Criar e configurar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
