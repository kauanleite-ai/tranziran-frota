'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { INTERVALO_AUDITORIA_DIAS } from '@/lib/constants'
import { encaminharOcorrenciaParaManutencao } from '@/lib/email/ocorrencias'

// ============================================================
// TIPOS
// ============================================================

export type FiltrosOcorrencia = {
  status?: string
  gravidade?: string
  responsavel?: string
  veiculo_id?: string
  empresa_id?: string
  busca?: string
}

// ============================================================
// LISTAGEM
// ============================================================

export async function listarOcorrencias(filtros?: FiltrosOcorrencia) {
  const supabase = await createClient()

  let query = supabase
    .from('ocorrencias')
    .select(`
      id, numero, descricao, gravidade, responsavel, prazo, status, status_tratativa, bloqueante,
      email_status, email_enviado_em, data_entrada_oficina, data_saida_oficina,
      criado_em, data_resolucao, checklist_id, auditoria_id, item_id,
      veiculos(id, placa, codigo_frota, tipo),
      checklist_items(id, nome),
      checklist_fotos(id, storage_path)
    `)
    .order('criado_em', { ascending: false })
    .limit(200)

  if (filtros?.status) query = query.eq('status', filtros.status)
  if (filtros?.gravidade) query = query.eq('gravidade', filtros.gravidade)
  if (filtros?.responsavel) query = query.eq('responsavel', filtros.responsavel)
  if (filtros?.veiculo_id) query = query.eq('veiculo_id', filtros.veiculo_id)
  if (filtros?.busca) {
    query = query.or(
      `descricao.ilike.%${filtros.busca}%,veiculos.placa.ilike.%${filtros.busca}%`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function contadoresOcorrencias() {
  const supabase = await createClient()

  const [abertas, criticas, emAnalise, aguardando] = await Promise.all([
    supabase
      .from('ocorrencias')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'aberta'),
    supabase
      .from('ocorrencias')
      .select('*', { count: 'exact', head: true })
      .eq('gravidade', 'critica')
      .in('status', ['aberta', 'em_analise', 'aguardando_manutencao']),
    supabase
      .from('ocorrencias')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'em_analise'),
    supabase
      .from('ocorrencias')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'aguardando_manutencao'),
  ])

  return {
    abertas: abertas.count ?? 0,
    criticas: criticas.count ?? 0,
    emAnalise: emAnalise.count ?? 0,
    aguardando: aguardando.count ?? 0,
  }
}

// ============================================================
// DETALHES
// ============================================================

export async function buscarOcorrencia(id: string) {
  const supabase = await createClient()

  const { data: ocorrencia, error } = await supabase
    .from('ocorrencias')
    .select(`
      id, numero, descricao, gravidade, responsavel, prazo, status, status_tratativa, bloqueante,
      email_status, email_erro, email_enviado_em, email_destinatarios, protocolo_email,
      data_encaminhado_manutencao, data_devolutiva_manutencao, data_solicitado_oficina,
      data_entrada_oficina, data_saida_oficina, data_validacao_frota, dias_em_oficina,
      dias_pendencia_total, devolutiva_manutencao, criado_em, data_resolucao, checklist_id, auditoria_id, item_id,
      veiculos(id, placa, codigo_frota, tipo, fabricante, modelo),
      checklist_items(
        id, nome, item_critico,
        checklist_categorias(nome)
      ),
      checklists(id, tipo, data_conclusao),
      auditorias(id, data_conclusao)
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)

  // Busca histórico de movimentações
  const { data: historico, error: errHistorico } = await supabase
    .from('ocorrencia_historico')
    .select(`
      id, status_anterior, status_novo, observacao, criado_em,
      feito_por
    `)
    .eq('ocorrencia_id', id)
    .order('criado_em', { ascending: true })

  if (errHistorico) throw new Error(errHistorico.message)

  // Busca perfis dos usuários que aparecem no histórico
  const userIds = [...new Set((historico ?? []).map((h) => h.feito_por))]
  let perfisMap = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: perfis } = await supabase
      .from('usuarios_perfis')
      .select('user_id, nome')
      .in('user_id', userIds)
    perfisMap = new Map((perfis ?? []).map((p) => [p.user_id, p.nome]))
  }

  // Busca fotos da ocorrência.
  // Regra nova: fotos futuras ficam vinculadas diretamente em checklist_fotos.ocorrencia_id.
  // Regra de compatibilidade: ocorrências já criadas antes do ajuste podem ter fotos
  // somente na resposta do checklist/auditoria. Por isso também buscamos pelo item de origem.
  const fotosMap = new Map<string, { id: string; storage_path: string; nome_original: string; criado_em: string }>()

  const { data: fotosDiretas } = await supabase
    .from('checklist_fotos')
    .select('id, storage_path, nome_original, criado_em')
    .eq('ocorrencia_id', id)
    .order('criado_em', { ascending: true })

  for (const foto of fotosDiretas ?? []) fotosMap.set(foto.id, foto)

  const origem = ocorrencia as unknown as {
    checklist_id: string | null
    auditoria_id: string | null
    item_id: string | null
  }

  if (origem.item_id && origem.checklist_id) {
    const { data: respostasOrigem } = await supabase
      .from('checklist_respostas')
      .select('id')
      .eq('checklist_id', origem.checklist_id)
      .eq('item_id', origem.item_id)

    const respostaIds = (respostasOrigem ?? []).map((r) => r.id)
    if (respostaIds.length > 0) {
      const { data: fotosOrigem } = await supabase
        .from('checklist_fotos')
        .select('id, storage_path, nome_original, criado_em')
        .in('resposta_id', respostaIds)
        .order('criado_em', { ascending: true })

      for (const foto of fotosOrigem ?? []) fotosMap.set(foto.id, foto)
    }
  }

  if (origem.item_id && origem.auditoria_id) {
    const { data: respostasOrigem } = await supabase
      .from('auditoria_respostas')
      .select('id')
      .eq('auditoria_id', origem.auditoria_id)
      .eq('item_id', origem.item_id)

    const respostaIds = (respostasOrigem ?? []).map((r) => r.id)
    if (respostaIds.length > 0) {
      const { data: fotosOrigem } = await supabase
        .from('checklist_fotos')
        .select('id, storage_path, nome_original, criado_em')
        .in('resposta_id', respostaIds)
        .order('criado_em', { ascending: true })

      for (const foto of fotosOrigem ?? []) fotosMap.set(foto.id, foto)
    }
  }

  return {
    ocorrencia,
    historico: (historico ?? []).map((h) => ({
      ...h,
      nome_usuario: perfisMap.get(h.feito_por) ?? 'Usuário',
    })),
    fotos: [...fotosMap.values()].sort(
      (a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
    ),
  }
}

// ============================================================
// CRIAÇÃO MANUAL
// ============================================================

export async function criarOcorrencia(dados: {
  veiculo_id: string
  item_id: string
  descricao: string
  gravidade: string
  responsavel: string
  prazo?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado.')

  const { data, error } = await supabase
    .from('ocorrencias')
    .insert({
      veiculo_id: dados.veiculo_id,
      item_id: dados.item_id,
      descricao: dados.descricao.trim(),
      gravidade: dados.gravidade as never,
      responsavel: dados.responsavel as never,
      prazo: dados.prazo || null,
      status: 'aberta' as never,
      status_tratativa: 'nao_conformidade_aberta',
      bloqueante: true,
      aberta_por: user.id,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await encaminharOcorrenciaParaManutencao(data.id)

  revalidatePath('/ocorrencias')
  revalidatePath('/veiculos')
  return data
}

// ============================================================
// MOVIMENTAÇÃO DE STATUS
// ============================================================

export async function moverStatusOcorrencia(
  id: string,
  novoStatus: string,
  observacao?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado.')

  const { data: atual } = await supabase
    .from('ocorrencias')
    .select('status')
    .eq('id', id)
    .single()

  if (!atual) throw new Error('Ocorrência não encontrada.')

  const updatePayload: Record<string, unknown> = { status: novoStatus as never }

  if (novoStatus === 'resolvida') {
    updatePayload.resolvida_por = user.id
    updatePayload.data_resolucao = new Date().toISOString()
  }

  const { error: errUpdate } = await supabase
    .from('ocorrencias')
    .update(updatePayload)
    .eq('id', id)

  if (errUpdate) throw new Error(errUpdate.message)

  // Registra no histórico manualmente (o trigger do banco já faz isso,
  // mas garantimos aqui também com a observação do usuário)
  if (observacao?.trim()) {
    await supabase.from('ocorrencia_historico').insert({
      ocorrencia_id: id,
      status_anterior: atual.status as never,
      status_novo: novoStatus as never,
      observacao: observacao.trim(),
      feito_por: user.id,
    })
  }

  // Se resolvida, atualiza o estado atual do veículo para o item
  if (novoStatus === 'resolvida') {
    const { data: oc } = await supabase
      .from('ocorrencias')
      .select('veiculo_id, item_id')
      .eq('id', id)
      .single()

    if (oc) {
      await supabase
        .from('veiculo_estado_atual')
        .update({
          resposta: 'ok' as never,
          data_atualizacao: new Date().toISOString(),
          quem_atualizou: user.id,
        })
        .eq('veiculo_id', oc.veiculo_id)
        .eq('item_id', oc.item_id)

      await supabase.from('veiculo_estado_historico').insert({
        veiculo_id: oc.veiculo_id,
        item_id: oc.item_id,
        resposta_anterior: 'nao_ok' as never,
        resposta_nova: 'ok' as never,
        observacao_anterior: null,
        observacao_nova: observacao?.trim() || 'Resolvida.',
        origem: 'ocorrencia_resolvida' as never,
        ocorrencia_id: id,
        quem_alterou: user.id,
      })
    }
  }

  revalidatePath(`/ocorrencias/${id}`)
  revalidatePath('/ocorrencias')
  revalidatePath('/dashboard')
}

// ============================================================
// EDIÇÃO DE PRAZO / RESPONSÁVEL
// ============================================================

export async function atualizarOcorrencia(
  id: string,
  dados: { prazo?: string; responsavel?: string; gravidade?: string }
) {
  const supabase = await createClient()

  const payload: Record<string, unknown> = {}
  if (dados.prazo !== undefined) payload.prazo = dados.prazo || null
  if (dados.responsavel) payload.responsavel = dados.responsavel as never
  if (dados.gravidade) payload.gravidade = dados.gravidade as never

  const { error } = await supabase.from('ocorrencias').update(payload).eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath(`/ocorrencias/${id}`)
  revalidatePath('/ocorrencias')
}

// ============================================================
// UPLOAD DE FOTO DE SOLUÇÃO
// ============================================================

export async function registrarFotoSolucao(
  ocorrenciaId: string,
  foto: { storage_path: string; nome_original: string; tamanho_bytes: number; mime_type: string }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado.')

  const { error } = await supabase.from('checklist_fotos').insert({
    ocorrencia_id: ocorrenciaId,
    storage_path: foto.storage_path,
    nome_original: foto.nome_original,
    tamanho_bytes: foto.tamanho_bytes,
    mime_type: foto.mime_type,
    enviado_por: user.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/ocorrencias/${ocorrenciaId}`)
}

// ============================================================
// FLUXO NOVO — STATUS OPERACIONAL / MANUTENÇÃO
// ============================================================

function calcularDiasEntre(inicio?: string | null, fim?: string | null) {
  if (!inicio || !fim) return null
  const ms = new Date(fim).getTime() - new Date(inicio).getTime()
  if (Number.isNaN(ms) || ms < 0) return null
  return Math.round((ms / 1000 / 60 / 60 / 24) * 100) / 100
}

export async function reenviarEmailManutencao(ocorrenciaId: string) {
  const resultado = await encaminharOcorrenciaParaManutencao(ocorrenciaId)
  revalidatePath(`/ocorrencias/${ocorrenciaId}`)
  revalidatePath('/ocorrencias')
  revalidatePath('/veiculos')
  return resultado
}

export async function registrarEntradaOficina(ocorrenciaId: string, observacao?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado.')

  const agora = new Date().toISOString()

  const { data: ocorrencia, error } = await supabase
    .from('ocorrencias')
    .select('id, status, veiculo_id')
    .eq('id', ocorrenciaId)
    .single()

  if (error || !ocorrencia) throw new Error(error?.message ?? 'Ocorrência não encontrada.')

  const { error: errUpdate } = await supabase
    .from('ocorrencias')
    .update({
      status: 'em_analise' as never,
      status_tratativa: 'em_oficina',
      data_entrada_oficina: agora,
    })
    .eq('id', ocorrenciaId)

  if (errUpdate) throw new Error(errUpdate.message)

  await supabase.from('ocorrencia_historico').insert({
    ocorrencia_id: ocorrenciaId,
    status_anterior: ocorrencia.status as never,
    status_novo: 'em_analise' as never,
    observacao: observacao?.trim() || 'Veículo registrado como entrada em oficina.',
    feito_por: user.id,
  })

  await supabase
    .from('veiculos')
    .update({ status_operacional: 'em_oficina', bloqueado_checklist: true })
    .eq('id', ocorrencia.veiculo_id)

  revalidatePath(`/ocorrencias/${ocorrenciaId}`)
  revalidatePath('/ocorrencias')
  revalidatePath('/veiculos')
}

export async function validarLiberarOcorrencia(ocorrenciaId: string, observacao?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado.')

  const agora = new Date().toISOString()

  const { data: ocorrencia, error } = await supabase
    .from('ocorrencias')
    .select('id, status, veiculo_id, item_id, criado_em, data_entrada_oficina, data_saida_oficina')
    .eq('id', ocorrenciaId)
    .single()

  if (error || !ocorrencia) throw new Error(error?.message ?? 'Ocorrência não encontrada.')

  const diasOficina = calcularDiasEntre(ocorrencia.data_entrada_oficina, ocorrencia.data_saida_oficina ?? agora)
  const diasTotal = calcularDiasEntre(ocorrencia.criado_em, agora)

  const { error: errUpdate } = await supabase
    .from('ocorrencias')
    .update({
      status: 'resolvida' as never,
      status_tratativa: 'validada_liberada',
      resolvida_por: user.id,
      data_resolucao: agora,
      data_validacao_frota: agora,
      dias_em_oficina: diasOficina,
      dias_pendencia_total: diasTotal,
    })
    .eq('id', ocorrenciaId)

  if (errUpdate) throw new Error(errUpdate.message)

  await supabase.from('ocorrencia_historico').insert({
    ocorrencia_id: ocorrenciaId,
    status_anterior: ocorrencia.status as never,
    status_novo: 'resolvida' as never,
    observacao: observacao?.trim() || 'Ocorrência validada pela Frota e veículo liberado.',
    feito_por: user.id,
  })

  await supabase
    .from('veiculo_estado_atual')
    .update({
      resposta: 'ok' as never,
      observacao: observacao?.trim() || 'Item validado e liberado pela Frota.',
      data_atualizacao: agora,
      quem_atualizou: user.id,
    })
    .eq('veiculo_id', ocorrencia.veiculo_id)
    .eq('item_id', ocorrencia.item_id)

  await supabase.from('veiculo_estado_historico').insert({
    veiculo_id: ocorrencia.veiculo_id,
    item_id: ocorrencia.item_id,
    resposta_anterior: 'nao_ok' as never,
    resposta_nova: 'ok' as never,
    observacao_anterior: null,
    observacao_nova: observacao?.trim() || 'Validação final da Frota.',
    origem: 'ocorrencia_resolvida' as never,
    ocorrencia_id: ocorrenciaId,
    quem_alterou: user.id,
  })

  const { data: pendentes } = await supabase
    .from('ocorrencias')
    .select('id')
    .eq('veiculo_id', ocorrencia.veiculo_id)
    .eq('bloqueante', true)
    .not('id', 'eq', ocorrenciaId)
    .not('status', 'in', '(resolvida,cancelada)')
    .limit(1)

  if (!pendentes || pendentes.length === 0) {
    const proxima = new Date()
    proxima.setDate(proxima.getDate() + INTERVALO_AUDITORIA_DIAS)
    const dataProxima = proxima.toISOString().split('T')[0]

    await supabase
      .from('veiculos')
      .update({
        status_operacional: 'liberado',
        bloqueado_checklist: false,
        ocorrencia_bloqueante_id: null,
        bloqueio_motivo: null,
        data_liberacao_operacional: agora,
        data_proxima_auditoria: dataProxima,
      })
      .eq('id', ocorrencia.veiculo_id)

    await supabase.from('auditoria_agendamentos').insert({
      veiculo_id: ocorrencia.veiculo_id,
      data_agendada: dataProxima,
      status: 'pendente' as never,
    })
  }

  revalidatePath(`/ocorrencias/${ocorrenciaId}`)
  revalidatePath('/ocorrencias')
  revalidatePath('/veiculos')
  revalidatePath('/auditorias')
  revalidatePath('/dashboard')
}

// Uso administrativo emergencial: liberar checklist sem resolver a ocorrência.
// Mantém o histórico da ocorrência, mas remove o bloqueio operacional do veículo.
export async function liberarChecklistEmergencial(ocorrenciaId: string, observacao: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado.')
  if (!observacao.trim()) throw new Error('Informe o motivo da liberação emergencial.')

  const { data: ocorrencia, error } = await supabase
    .from('ocorrencias')
    .select('id, status, veiculo_id')
    .eq('id', ocorrenciaId)
    .single()

  if (error || !ocorrencia) throw new Error(error?.message ?? 'Ocorrência não encontrada.')

  await supabase
    .from('veiculos')
    .update({
      status_operacional: 'liberado',
      bloqueado_checklist: false,
      ocorrencia_bloqueante_id: null,
      bloqueio_motivo: null,
      data_liberacao_operacional: new Date().toISOString(),
    })
    .eq('id', ocorrencia.veiculo_id)

  await supabase.from('ocorrencia_historico').insert({
    ocorrencia_id: ocorrenciaId,
    status_anterior: ocorrencia.status as never,
    status_novo: ocorrencia.status as never,
    observacao: `[Liberação emergencial de checklist] ${observacao.trim()}`,
    feito_por: user.id,
  })

  revalidatePath(`/ocorrencias/${ocorrenciaId}`)
  revalidatePath('/ocorrencias')
  revalidatePath('/veiculos')
}
