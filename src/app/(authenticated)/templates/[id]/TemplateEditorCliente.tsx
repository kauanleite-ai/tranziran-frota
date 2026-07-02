'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, ChevronDown, ChevronUp, Pencil, Trash2,
  Camera, AlertTriangle, MessageSquare, FolderPlus, Send,
  ListChecks, GripVertical
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { ItemForm } from '@/components/templates/ItemForm'
import {
  criarCategoria, atualizarCategoria, excluirCategoria,
  criarItem, atualizarItem, excluirItem, moverItem,
  publicarVersao,
} from '@/lib/actions/templates'
import type { ItemFormData } from '@/lib/actions/templates'
import { TIPO_RESPOSTA_ITEM_LABEL, APLICA_TIPO_LABEL } from '@/lib/constants'
import { formatarData } from '@/utils'

type Item = ItemFormData & { id: string; ordem: number; ativo: boolean }
type Categoria = {
  id: string; nome: string; descricao: string | null; ordem: number; ativo: boolean
  checklist_items: Item[]
}
type Versao = { id: string; versao: number; publicado: boolean; publicado_em: string | null; criado_em: string }
type TemplateInfo = { id: string; nome: string; descricao: string | null; ativo: boolean; versao_atual_id: string | null }

interface Props {
  dados: {
    template: TemplateInfo
    versoes: Versao[]
    categorias: Categoria[]
    versaoAtualId?: string
  }
}

export function TemplateEditorCliente({ dados }: Props) {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const { template, versoes, categorias, versaoAtualId } = dados

  const [categoriasAbertas, setCategoriasAbertas] = useState<Set<string>>(
    new Set(categorias.slice(0, 1).map((c) => c.id))
  )
  const [modalCategoria, setModalCategoria] = useState(false)
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null)
  const [nomeCategoria, setNomeCategoria] = useState('')
  const [descCategoria, setDescCategoria] = useState('')
  const [loadingCategoria, setLoadingCategoria] = useState(false)

  const [modalItem, setModalItem] = useState<{ categoriaId: string; item?: Item } | null>(null)
  const [loadingPublicar, setLoadingPublicar] = useState(false)

  const versaoAtual = versoes.find((v) => v.id === versaoAtualId)
  const totalItens = categorias.reduce((acc, c) => acc + c.checklist_items.length, 0)

  function toggleCategoria(id: string) {
    setCategoriasAbertas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function abrirNovaCategoria() {
    setCategoriaEditando(null)
    setNomeCategoria('')
    setDescCategoria('')
    setModalCategoria(true)
  }

  function abrirEditarCategoria(c: Categoria) {
    setCategoriaEditando(c)
    setNomeCategoria(c.nome)
    setDescCategoria(c.descricao ?? '')
    setModalCategoria(true)
  }

  async function handleSalvarCategoria() {
    if (!nomeCategoria.trim()) return toastError('Informe o nome da categoria.')
    if (!versaoAtualId) return toastError('Versão do template não encontrada.')
    setLoadingCategoria(true)
    try {
      if (categoriaEditando) {
        await atualizarCategoria(categoriaEditando.id, { nome: nomeCategoria, descricao: descCategoria })
        success('Categoria atualizada!')
      } else {
        await criarCategoria(versaoAtualId, nomeCategoria, descCategoria)
        success('Categoria criada!')
      }
      setModalCategoria(false)
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar categoria.')
    } finally {
      setLoadingCategoria(false)
    }
  }

  async function handleExcluirCategoria(id: string) {
    if (!confirm('Excluir esta categoria?')) return
    try {
      await excluirCategoria(id)
      success('Categoria excluída.')
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao excluir categoria.')
    }
  }

  async function handleSalvarItem(data: ItemFormData) {
    if (modalItem?.item) {
      await atualizarItem(modalItem.item.id, data)
      success('Item atualizado!')
    } else {
      await criarItem(data)
      success('Item adicionado!')
    }
    setModalItem(null)
    router.refresh()
  }

  async function handleExcluirItem(item: Item) {
    if (!confirm(`Excluir o item "${item.nome}"?`)) return
    try {
      const resultado = await excluirItem(item.id)
      success(resultado.desativado ? 'Item desativado (possui histórico).' : 'Item excluído.')
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao excluir item.')
    }
  }

  async function handleMoverItem(item: Item, direcao: 'up' | 'down') {
    try {
      await moverItem(item.id, direcao, item.categoria_id)
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao reordenar.')
    }
  }

  async function handlePublicar() {
    if (!versaoAtualId) return
    if (!confirm('Publicar esta versão do template? Ela passará a ser usada em novos checklists.')) return
    setLoadingPublicar(true)
    try {
      await publicarVersao(versaoAtualId, template.id)
      success('Template publicado com sucesso!')
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao publicar.')
    } finally {
      setLoadingPublicar(false)
    }
  }

  function aplicaTags(item: Item): string[] {
    return (Object.entries(APLICA_TIPO_LABEL) as [keyof typeof APLICA_TIPO_LABEL, string][])
      .filter(([field]) => item[field])
      .map(([, label]) => label)
  }

  return (
    <div className="flex-1 p-6 space-y-5">
      <button
        onClick={() => router.push('/templates')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para templates
      </button>

      {/* Status e ações da versão */}
      <Card>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <ListChecks className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900 text-sm">
                  Versão {versaoAtual?.versao ?? '—'}
                </p>
                <Badge variant={versaoAtual?.publicado ? 'green' : 'yellow'}>
                  {versaoAtual?.publicado ? 'Publicada' : 'Rascunho'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {categorias.length} categoria(s) · {totalItens} item(ns)
                {versaoAtual?.publicado_em && ` · Publicada em ${formatarData(versaoAtual.publicado_em)}`}
              </p>
            </div>
          </div>
          {!versaoAtual?.publicado && (
            <Button onClick={handlePublicar} loading={loadingPublicar} disabled={totalItens === 0}>
              <Send className="w-4 h-4" />
              Publicar versão
            </Button>
          )}
        </div>
      </Card>

      {/* Categorias */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Categorias e itens</h2>
        <Button size="sm" variant="outline" onClick={abrirNovaCategoria}>
          <FolderPlus className="w-3.5 h-3.5" />
          Nova categoria
        </Button>
      </div>

      {categorias.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderPlus className="w-9 h-9 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium text-sm">Nenhuma categoria criada</p>
            <p className="text-slate-400 text-xs mt-1 mb-4">
              Categorias organizam os itens do checklist (ex: Documentação, Cavalo, Baú)
            </p>
            <Button size="sm" onClick={abrirNovaCategoria}>
              <Plus className="w-4 h-4" />
              Criar primeira categoria
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {categorias.map((cat) => {
            const aberta = categoriasAbertas.has(cat.id)
            return (
              <Card key={cat.id} padding="none" className="overflow-hidden">
                {/* Cabeçalho da categoria */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleCategoria(cat.id)}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{cat.nome}</p>
                      <p className="text-xs text-slate-400">
                        {cat.checklist_items.length} item(ns)
                        {cat.descricao && ` · ${cat.descricao}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => abrirEditarCategoria(cat)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleExcluirCategoria(cat.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleCategoria(cat.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      {aberta ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Itens */}
                {aberta && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {cat.checklist_items.length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-sm text-slate-400">Nenhum item nesta categoria ainda.</p>
                      </div>
                    ) : (
                      cat.checklist_items.map((item, idx) => (
                        <div key={item.id} className="flex items-start justify-between p-3.5 pl-12 hover:bg-slate-50/50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-slate-800">{item.nome}</p>
                              {item.item_critico && (
                                <Badge variant="red">
                                  <AlertTriangle className="w-3 h-3 mr-0.5" />
                                  Crítico
                                </Badge>
                              )}
                              {item.exige_foto && (
                                <Badge variant="blue">
                                  <Camera className="w-3 h-3 mr-0.5" />
                                  Foto
                                </Badge>
                              )}
                              {item.exige_obs_se_nao_ok && (
                                <Badge variant="gray">
                                  <MessageSquare className="w-3 h-3 mr-0.5" />
                                  Obs.
                                </Badge>
                              )}
                            </div>
                            {item.descricao && (
                              <p className="text-xs text-slate-400 mt-1">{item.descricao}</p>
                            )}
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <span className="text-xs text-slate-400">
                                {TIPO_RESPOSTA_ITEM_LABEL[item.tipo_resposta as keyof typeof TIPO_RESPOSTA_ITEM_LABEL]}
                              </span>
                              {aplicaTags(item).length > 0 && (
                                <span className="text-xs text-slate-300">
                                  · {aplicaTags(item).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 ml-3">
                            <button
                              onClick={() => handleMoverItem(item, 'up')}
                              disabled={idx === 0}
                              className="p-1 text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoverItem(item, 'down')}
                              disabled={idx === cat.checklist_items.length - 1}
                              className="p-1 text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setModalItem({ categoriaId: cat.id, item })}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors ml-1"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleExcluirItem(item)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                    <div className="p-3 pl-12">
                      <button
                        onClick={() => setModalItem({ categoriaId: cat.id })}
                        className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar item
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal categoria */}
      <Modal
        open={modalCategoria}
        onClose={() => setModalCategoria(false)}
        title={categoriaEditando ? 'Editar Categoria' : 'Nova Categoria'}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nome da categoria"
            value={nomeCategoria}
            onChange={(e) => setNomeCategoria(e.target.value)}
            placeholder="Ex: Documentação"
            required
          />
          <Input
            label="Descrição (opcional)"
            value={descCategoria}
            onChange={(e) => setDescCategoria(e.target.value)}
            placeholder="Breve descrição da categoria"
          />
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setModalCategoria(false)}>Cancelar</Button>
            <Button onClick={handleSalvarCategoria} loading={loadingCategoria}>
              {categoriaEditando ? 'Salvar' : 'Criar categoria'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal item */}
      <Modal
        open={!!modalItem}
        onClose={() => setModalItem(null)}
        title={modalItem?.item ? 'Editar Item' : 'Novo Item'}
        size="lg"
      >
        {modalItem && (
          <ItemForm
            categoriaId={modalItem.categoriaId}
            inicial={modalItem.item}
            onSave={handleSalvarItem}
            onCancel={() => setModalItem(null)}
          />
        )}
      </Modal>
    </div>
  )
}
