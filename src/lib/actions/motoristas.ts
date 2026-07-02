'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type MotoristaFormData = {
  nome: string
  matricula: string
  cpf?: string
  telefone?: string
  empresa_id: string
  unidade_id?: string
  cnh?: string
  cnh_validade?: string
  mopp: boolean
  mopp_validade?: string
  status: string
}

export async function listarMotoristas(filtros?: {
  busca?: string
  status?: string
  empresa_id?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('motoristas')
    .select(`
      id, nome, matricula, cpf, telefone, cnh, cnh_validade,
      mopp, mopp_validade, status, criado_em,
      empresas(id, nome),
      unidades(id, nome)
    `)
    .order('nome', { ascending: true })

  if (filtros?.busca) {
    query = query.or(`nome.ilike.%${filtros.busca}%,matricula.ilike.%${filtros.busca}%`)
  }
  if (filtros?.status) query = query.eq('status', filtros.status)
  if (filtros?.empresa_id) query = query.eq('empresa_id', filtros.empresa_id)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function buscarMotorista(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('motoristas')
    .select(`
      *,
      empresas(id, nome),
      unidades(id, nome)
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function criarMotorista(formData: MotoristaFormData) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('motoristas')
    .insert({
      nome: formData.nome.trim(),
      matricula: formData.matricula.trim(),
      cpf: formData.cpf?.replace(/\D/g, '') || null,
      telefone: formData.telefone?.replace(/\D/g, '') || null,
      empresa_id: formData.empresa_id,
      unidade_id: formData.unidade_id || null,
      cnh: formData.cnh?.trim() || null,
      cnh_validade: formData.cnh_validade || null,
      mopp: formData.mopp,
      mopp_validade: formData.mopp_validade || null,
      status: formData.status as never,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      if (error.message.includes('cpf')) throw new Error('Já existe um motorista com esse CPF.')
      throw new Error('Já existe um motorista com essa matrícula nesta empresa.')
    }
    throw new Error(error.message)
  }

  revalidatePath('/motoristas')
  return data
}

export async function atualizarMotorista(id: string, formData: Partial<MotoristaFormData>) {
  const supabase = await createClient()

  const payload: Record<string, unknown> = {
    ...formData,
    cpf: formData.cpf?.replace(/\D/g, '') || null,
    telefone: formData.telefone?.replace(/\D/g, '') || null,
    unidade_id: formData.unidade_id || null,
    cnh: formData.cnh?.trim() || null,
    cnh_validade: formData.cnh_validade || null,
    mopp_validade: formData.mopp_validade || null,
  }

  const { error } = await supabase
    .from('motoristas')
    .update(payload)
    .eq('id', id)

  if (error) {
    if (error.code === '23505') throw new Error('CPF ou matrícula já cadastrado.')
    throw new Error(error.message)
  }

  revalidatePath('/motoristas')
  revalidatePath(`/motoristas/${id}`)
}

export async function excluirMotorista(id: string) {
  const supabase = await createClient()

  // Verifica se tem vínculos com checklists
  const { count } = await supabase
    .from('checklists')
    .select('*', { count: 'exact', head: true })
    .eq('motorista_id', id)

  if ((count ?? 0) > 0) {
    throw new Error('Não é possível excluir um motorista que possui checklists registrados.')
  }

  const { error } = await supabase.from('motoristas').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/motoristas')
}

export type MotoristaImportacaoItem = MotoristaFormData & { linha: number }

export async function importarMotoristasEmMassa(itens: MotoristaImportacaoItem[]) {
  const supabase = await createClient()
  const erros: Array<{ linha: number; mensagem: string }> = []
  let criados = 0

  for (const item of itens) {
    try {
      if (!item.nome?.trim() || !item.matricula?.trim() || !item.empresa_id) {
        erros.push({ linha: item.linha, mensagem: 'Nome, matrícula e empresa são obrigatórios.' })
        continue
      }

      const { error } = await supabase.from('motoristas').insert({
        nome: item.nome.trim(),
        matricula: item.matricula.trim(),
        cpf: item.cpf?.replace(/\D/g, '') || null,
        telefone: item.telefone?.replace(/\D/g, '') || null,
        empresa_id: item.empresa_id,
        unidade_id: item.unidade_id || null,
        cnh: item.cnh?.trim() || null,
        cnh_validade: item.cnh_validade || null,
        mopp: item.mopp,
        mopp_validade: item.mopp_validade || null,
        status: item.status as never,
      })

      if (error) {
        if (error.code === '23505') {
          erros.push({ linha: item.linha, mensagem: 'CPF ou matrícula já cadastrados.' })
        } else {
          erros.push({ linha: item.linha, mensagem: error.message })
        }
        continue
      }

      criados++
    } catch (error) {
      erros.push({
        linha: item.linha,
        mensagem: error instanceof Error ? error.message : 'Erro desconhecido ao importar motorista.',
      })
    }
  }

  revalidatePath('/motoristas')
  revalidatePath('/dashboard')

  return { criados, erros }
}
