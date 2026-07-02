'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ---- EMPRESAS ----

export async function listarEmpresas() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('empresas')
    .select('id, nome, cnpj, ativo, criado_em')
    .order('nome')

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function criarEmpresa(nome: string, cnpj?: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('empresas')
    .insert({
      nome: nome.trim(),
      cnpj: cnpj?.replace(/\D/g, '') || null,
      ativo: true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('Já existe uma empresa com esse CNPJ.')
    throw new Error(error.message)
  }

  revalidatePath('/configuracoes')
  return data
}

export async function atualizarEmpresa(id: string, nome: string, cnpj?: string, ativo?: boolean) {
  const supabase = await createClient()

  const payload: Record<string, unknown> = { nome: nome.trim() }
  if (cnpj !== undefined) payload.cnpj = cnpj.replace(/\D/g, '') || null
  if (ativo !== undefined) payload.ativo = ativo

  const { error } = await supabase
    .from('empresas')
    .update(payload)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/configuracoes')
}

// ---- UNIDADES ----

export async function listarUnidades(empresa_id?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('unidades')
    .select('id, nome, cidade, estado, ativo, empresa_id, empresas(nome)')
    .order('nome')

  if (empresa_id) query = query.eq('empresa_id', empresa_id)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function criarUnidade(
  empresa_id: string,
  nome: string,
  cidade?: string,
  estado?: string,
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('unidades')
    .insert({
      empresa_id,
      nome: nome.trim(),
      cidade: cidade?.trim() || null,
      estado: estado?.toUpperCase().slice(0, 2) || null,
      ativo: true,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/configuracoes')
  return data
}

export async function atualizarUnidade(
  id: string,
  dados: { nome?: string; cidade?: string; estado?: string; ativo?: boolean },
) {
  const supabase = await createClient()
  const { error } = await supabase.from('unidades').update(dados).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/configuracoes')
}
