'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type VeiculoFormData = {
  placa: string
  codigo_frota?: string
  empresa_id: string
  unidade_id?: string
  tipo: string
  fabricante?: string
  modelo?: string
  ano?: number
  status: string
  km_atual?: number
}

export async function listarVeiculos(filtros?: {
  busca?: string
  status?: string
  tipo?: string
  empresa_id?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('veiculos')
    .select(`
      id, placa, codigo_frota, tipo, fabricante, modelo, ano,
      status, km_atual, checklist_base_concluido, data_proxima_auditoria,
      status_operacional, bloqueado_checklist, ocorrencia_bloqueante_id, bloqueio_motivo,
      criado_em,
      empresas(id, nome),
      unidades(id, nome)
    `)
    .order('placa', { ascending: true })

  if (filtros?.busca) {
    query = query.or(`placa.ilike.%${filtros.busca}%,codigo_frota.ilike.%${filtros.busca}%,modelo.ilike.%${filtros.busca}%`)
  }
  if (filtros?.status) query = query.eq('status', filtros.status)
  if (filtros?.tipo) query = query.eq('tipo', filtros.tipo)
  if (filtros?.empresa_id) query = query.eq('empresa_id', filtros.empresa_id)

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function buscarVeiculo(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('veiculos')
    .select(`
      *,
      empresas(id, nome),
      unidades(id, nome),
      veiculo_motorista_vinculos(
        id, ativo, data_inicio,
        motoristas(id, nome, matricula)
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function criarVeiculo(formData: VeiculoFormData) {
  const supabase = await createClient()

  const placa = formData.placa.toUpperCase().replace(/[^A-Z0-9]/g, '')

  const { data, error } = await supabase
    .from('veiculos')
    .insert({
      placa,
      codigo_frota: formData.codigo_frota || null,
      empresa_id: formData.empresa_id,
      unidade_id: formData.unidade_id || null,
      tipo: formData.tipo as never,
      fabricante: formData.fabricante || null,
      modelo: formData.modelo || null,
      ano: formData.ano || null,
      status: formData.status as never,
      km_atual: formData.km_atual || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('Já existe um veículo com essa placa.')
    throw new Error(error.message)
  }

  revalidatePath('/veiculos')
  return data
}

export async function atualizarVeiculo(id: string, formData: Partial<VeiculoFormData>) {
  const supabase = await createClient()

  const payload: Record<string, unknown> = { ...formData }
  if (formData.placa) {
    payload.placa = formData.placa.toUpperCase().replace(/[^A-Z0-9]/g, '')
  }
  if (formData.unidade_id === '') payload.unidade_id = null
  if (formData.codigo_frota === '') payload.codigo_frota = null

  const { error } = await supabase
    .from('veiculos')
    .update(payload)
    .eq('id', id)

  if (error) {
    if (error.code === '23505') throw new Error('Já existe um veículo com essa placa.')
    throw new Error(error.message)
  }

  revalidatePath('/veiculos')
  revalidatePath(`/veiculos/${id}`)
}

export async function excluirVeiculo(id: string) {
  const supabase = await createClient()

  // Verifica se tem checklist base concluído — não pode excluir
  const { data: veiculo } = await supabase
    .from('veiculos')
    .select('checklist_base_concluido, placa')
    .eq('id', id)
    .single()

  if (veiculo?.checklist_base_concluido) {
    throw new Error('Não é possível excluir um veículo que já possui checklist base concluído.')
  }

  const { error } = await supabase.from('veiculos').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/veiculos')
}

export async function vincularMotorista(veiculo_id: string, motorista_id: string) {
  const supabase = await createClient()

  // Desativa vínculo atual se existir
  await supabase
    .from('veiculo_motorista_vinculos')
    .update({ ativo: false, data_fim: new Date().toISOString().split('T')[0] })
    .eq('veiculo_id', veiculo_id)
    .eq('ativo', true)

  // Cria novo vínculo
  const { error } = await supabase.from('veiculo_motorista_vinculos').insert({
    veiculo_id,
    motorista_id,
    data_inicio: new Date().toISOString().split('T')[0],
    ativo: true,
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/veiculos/${veiculo_id}`)
}

export type VeiculoImportacaoItem = VeiculoFormData & { linha: number }

export async function importarVeiculosEmMassa(itens: VeiculoImportacaoItem[]) {
  const supabase = await createClient()
  const erros: Array<{ linha: number; mensagem: string }> = []
  let criados = 0

  for (const item of itens) {
    try {
      const placa = item.placa.toUpperCase().replace(/[^A-Z0-9]/g, '')

      if (!placa || !item.empresa_id || !item.tipo || !item.status) {
        erros.push({ linha: item.linha, mensagem: 'Placa, empresa, tipo e status são obrigatórios.' })
        continue
      }

      const { error } = await supabase.from('veiculos').insert({
        placa,
        codigo_frota: item.codigo_frota || null,
        empresa_id: item.empresa_id,
        unidade_id: item.unidade_id || null,
        tipo: item.tipo as never,
        fabricante: item.fabricante || null,
        modelo: item.modelo || null,
        ano: item.ano || null,
        status: item.status as never,
        km_atual: item.km_atual || null,
      })

      if (error) {
        if (error.code === '23505') {
          erros.push({ linha: item.linha, mensagem: `Placa ${placa} já cadastrada.` })
        } else {
          erros.push({ linha: item.linha, mensagem: error.message })
        }
        continue
      }

      criados++
    } catch (error) {
      erros.push({
        linha: item.linha,
        mensagem: error instanceof Error ? error.message : 'Erro desconhecido ao importar veículo.',
      })
    }
  }

  revalidatePath('/veiculos')
  revalidatePath('/dashboard')

  return { criados, erros }
}
