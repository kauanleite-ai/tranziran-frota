'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================================
// TEMPLATES
// ============================================================

export async function listarTemplates() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('checklist_templates')
    .select(`
      id, nome, descricao, ativo, versao_atual_id, criado_em,
      checklist_template_versions(id, versao, publicado)
    `)
    .order('criado_em', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function buscarTemplateCompleto(templateId: string) {
  const supabase = await createClient()

  const { data: template, error: errTemplate } = await supabase
    .from('checklist_templates')
    .select('id, nome, descricao, ativo, versao_atual_id')
    .eq('id', templateId)
    .single()

  if (errTemplate) throw new Error(errTemplate.message)

  const { data: versoes, error: errVersoes } = await supabase
    .from('checklist_template_versions')
    .select('id, versao, publicado, publicado_em, criado_em')
    .eq('template_id', templateId)
    .order('versao', { ascending: false })

  if (errVersoes) throw new Error(errVersoes.message)

  const versaoAtualId = template.versao_atual_id ?? versoes?.[0]?.id

  if (!versaoAtualId) {
    return { template, versoes: versoes ?? [], categorias: [] }
  }

  const { data: categorias, error: errCategorias } = await supabase
    .from('checklist_categorias')
    .select(`
      id, nome, descricao, ordem, ativo,
      checklist_items(
        id, nome, descricao, tipo_resposta, exige_foto, exige_obs_se_nao_ok,
        item_critico, aplica_cavalo, aplica_carreta, aplica_bau, aplica_truck,
        aplica_carro_passeio, aplica_guindaste, ordem, ativo
      )
    `)
    .eq('template_version_id', versaoAtualId)
    .order('ordem', { ascending: true })

  if (errCategorias) throw new Error(errCategorias.message)

  // Ordena os itens dentro de cada categoria
  const categoriasOrdenadas = (categorias ?? []).map((cat) => ({
    ...cat,
    checklist_items: (cat.checklist_items ?? []).sort((a, b) => a.ordem - b.ordem),
  }))

  return { template, versoes: versoes ?? [], categorias: categoriasOrdenadas, versaoAtualId }
}

export async function criarTemplate(nome: string, descricao?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado.')

  const { data: template, error: errTemplate } = await supabase
    .from('checklist_templates')
    .insert({
      nome: nome.trim(),
      descricao: descricao?.trim() || null,
      ativo: true,
      criado_por: user.id,
    })
    .select()
    .single()

  if (errTemplate) throw new Error(errTemplate.message)

  // Cria a primeira versão automaticamente
  const { data: versao, error: errVersao } = await supabase
    .from('checklist_template_versions')
    .insert({
      template_id: template.id,
      versao: 1,
      publicado: false,
      criado_por: user.id,
    })
    .select()
    .single()

  if (errVersao) throw new Error(errVersao.message)

  await supabase
    .from('checklist_templates')
    .update({ versao_atual_id: versao.id })
    .eq('id', template.id)

  revalidatePath('/templates')
  return template
}

export async function atualizarTemplate(id: string, nome: string, descricao?: string, ativo?: boolean) {
  const supabase = await createClient()

  const payload: Record<string, unknown> = { nome: nome.trim() }
  if (descricao !== undefined) payload.descricao = descricao.trim() || null
  if (ativo !== undefined) payload.ativo = ativo

  const { error } = await supabase.from('checklist_templates').update(payload).eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/templates')
  revalidatePath(`/templates/${id}`)
}

export async function publicarVersao(versionId: string, templateId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('checklist_template_versions')
    .update({ publicado: true, publicado_em: new Date().toISOString() })
    .eq('id', versionId)

  if (error) throw new Error(error.message)

  await supabase
    .from('checklist_templates')
    .update({ versao_atual_id: versionId })
    .eq('id', templateId)

  revalidatePath(`/templates/${templateId}`)
}

// ============================================================
// CATEGORIAS
// ============================================================

export async function criarCategoria(templateVersionId: string, nome: string, descricao?: string) {
  const supabase = await createClient()

  const { data: existentes } = await supabase
    .from('checklist_categorias')
    .select('ordem')
    .eq('template_version_id', templateVersionId)
    .order('ordem', { ascending: false })
    .limit(1)

  const proximaOrdem = (existentes?.[0]?.ordem ?? 0) + 1

  const { data, error } = await supabase
    .from('checklist_categorias')
    .insert({
      template_version_id: templateVersionId,
      nome: nome.trim(),
      descricao: descricao?.trim() || null,
      ordem: proximaOrdem,
      ativo: true,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/templates')
  return data
}

export async function atualizarCategoria(
  id: string,
  dados: { nome?: string; descricao?: string; ativo?: boolean }
) {
  const supabase = await createClient()
  const { error } = await supabase.from('checklist_categorias').update(dados).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/templates')
}

export async function reordenarCategoria(id: string, novaOrdem: number) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('checklist_categorias')
    .update({ ordem: novaOrdem })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/templates')
}

export async function excluirCategoria(id: string) {
  const supabase = await createClient()

  const { count } = await supabase
    .from('checklist_items')
    .select('*', { count: 'exact', head: true })
    .eq('categoria_id', id)

  if ((count ?? 0) > 0) {
    throw new Error('Não é possível excluir uma categoria que possui itens. Remova os itens primeiro.')
  }

  const { error } = await supabase.from('checklist_categorias').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/templates')
}

// ============================================================
// ITENS
// ============================================================

export type ItemFormData = {
  categoria_id: string
  nome: string
  descricao?: string
  tipo_resposta: string
  exige_foto: boolean
  exige_obs_se_nao_ok: boolean
  item_critico: boolean
  aplica_cavalo: boolean
  aplica_carreta: boolean
  aplica_bau: boolean
  aplica_truck: boolean
  aplica_carro_passeio: boolean
  aplica_guindaste: boolean
}

export async function criarItem(dados: ItemFormData) {
  const supabase = await createClient()

  const { data: existentes } = await supabase
    .from('checklist_items')
    .select('ordem')
    .eq('categoria_id', dados.categoria_id)
    .order('ordem', { ascending: false })
    .limit(1)

  const proximaOrdem = (existentes?.[0]?.ordem ?? 0) + 1

  const { data, error } = await supabase
    .from('checklist_items')
    .insert({
      categoria_id: dados.categoria_id,
      nome: dados.nome.trim(),
      descricao: dados.descricao?.trim() || null,
      tipo_resposta: dados.tipo_resposta as never,
      exige_foto: dados.exige_foto,
      exige_obs_se_nao_ok: dados.exige_obs_se_nao_ok,
      item_critico: dados.item_critico,
      aplica_cavalo: dados.aplica_cavalo,
      aplica_carreta: dados.aplica_carreta,
      aplica_bau: dados.aplica_bau,
      aplica_truck: dados.aplica_truck,
      aplica_carro_passeio: dados.aplica_carro_passeio,
      aplica_guindaste: dados.aplica_guindaste,
      ordem: proximaOrdem,
      ativo: true,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/templates')
  return data
}

export async function atualizarItem(id: string, dados: Partial<ItemFormData>) {
  const supabase = await createClient()

  const payload: Record<string, unknown> = { ...dados }
  if (dados.nome) payload.nome = dados.nome.trim()
  if (dados.descricao !== undefined) payload.descricao = dados.descricao?.trim() || null

  const { error } = await supabase.from('checklist_items').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/templates')
}

export async function moverItem(id: string, direcao: 'up' | 'down', categoriaId: string) {
  const supabase = await createClient()

  const { data: itens, error } = await supabase
    .from('checklist_items')
    .select('id, ordem')
    .eq('categoria_id', categoriaId)
    .order('ordem', { ascending: true })

  if (error) throw new Error(error.message)
  if (!itens) return

  const idx = itens.findIndex((i) => i.id === id)
  if (idx === -1) return

  const targetIdx = direcao === 'up' ? idx - 1 : idx + 1
  if (targetIdx < 0 || targetIdx >= itens.length) return

  const itemAtual = itens[idx]
  const itemAlvo = itens[targetIdx]

  await Promise.all([
    supabase.from('checklist_items').update({ ordem: itemAlvo.ordem }).eq('id', itemAtual.id),
    supabase.from('checklist_items').update({ ordem: itemAtual.ordem }).eq('id', itemAlvo.id),
  ])

  revalidatePath('/templates')
}

export async function excluirItem(id: string) {
  const supabase = await createClient()

  const { count } = await supabase
    .from('checklist_respostas')
    .select('*', { count: 'exact', head: true })
    .eq('item_id', id)

  if ((count ?? 0) > 0) {
    // Não exclui — apenas desativa para preservar histórico
    const { error } = await supabase
      .from('checklist_items')
      .update({ ativo: false })
      .eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/templates')
    return { desativado: true }
  }

  const { error } = await supabase.from('checklist_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/templates')
  return { desativado: false }
}
