'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { INTERVALO_AUDITORIA_DIAS } from '@/lib/constants'

// ============================================================
// TIPOS
// ============================================================

export type RespostaAuditoriaInput = {
  item_id: string
  continua_igual: boolean
  // Preenchido apenas se continua_igual = false
  resposta_nova?: 'ok' | 'nao_tem' | 'nao_ok' | 'nao_aplica' | null
  observacao?: string
  fotos?: { storage_path: string; nome_original: string; tamanho_bytes: number; mime_type: string }[]
}

export type FinalizarAuditoriaInput = {
  auditoria_id: string
  veiculo_id: string
  motorista_id?: string
  km?: number
  observacoes_gerais?: string
  respostas: RespostaAuditoriaInput[]
  latitude?: number
  longitude?: number
}

// ============================================================
// LISTAGEM DE AGENDAMENTOS
// ============================================================

export async function listarAgendamentos(filtros?: {
  status?: string
  empresa_id?: string
  vencidas?: boolean
  proximas_dias?: number
}) {
  const supabase = await createClient()

  let query = supabase
    .from('auditoria_agendamentos')
    .select(`
      id, data_agendada, status, auditoria_id, criado_em,
      veiculos(
        id, placa, codigo_frota, tipo, km_atual,
        empresas(nome), unidades(nome)
      )
    `)
    .order('data_agendada', { ascending: true })

  if (filtros?.status) {
    query = query.eq('status', filtros.status)
  } else {
    query = query.in('status', ['pendente', 'vencida'])
  }

  if (filtros?.proximas_dias) {
    const limite = new Date()
    limite.setDate(limite.getDate() + filtros.proximas_dias)
    query = query.lte('data_agendada', limite.toISOString())
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  // Atualiza status de vencidas automaticamente
  const hoje = new Date().toISOString().split('T')[0]
  const paraVencer = (data ?? []).filter(
    (a) => a.status === 'pendente' && a.data_agendada < hoje
  )
  if (paraVencer.length > 0) {
    await supabase
      .from('auditoria_agendamentos')
      .update({ status: 'vencida' })
      .in('id', paraVencer.map((a) => a.id))
  }

  return (data ?? []).map((a) => ({
    ...a,
    status: a.status === 'pendente' && a.data_agendada < hoje ? 'vencida' : a.status,
  }))
}

// ============================================================
// CARREGAR DADOS PARA INICIAR AUDITORIA
// ============================================================

export async function dadosParaIniciarAuditoria(agendamentoId: string) {
  const supabase = await createClient()

  // 1. Busca o agendamento
  const { data: agendamento, error: errAg } = await supabase
    .from('auditoria_agendamentos')
    .select('id, veiculo_id, status, data_agendada')
    .eq('id', agendamentoId)
    .single()

  if (errAg) throw new Error(errAg.message)
  if (agendamento.status === 'realizada') {
    throw new Error('Esta auditoria já foi realizada.')
  }

  // 2. Busca o veículo e motorista ativo
  const { data: veiculo, error: errVeiculo } = await supabase
    .from('veiculos')
    .select(`
      id, placa, tipo, km_atual, fabricante, modelo,
      empresas(nome), unidades(nome),
      veiculo_motorista_vinculos(
        motorista_id, ativo,
        motoristas(id, nome, matricula)
      )
    `)
    .eq('id', agendamento.veiculo_id)
    .single()

  if (errVeiculo) throw new Error(errVeiculo.message)

  // 3. Busca o template ativo publicado
  const { data: templates } = await supabase
    .from('checklist_templates')
    .select('id, nome, versao_atual_id')
    .eq('ativo', true)
    .limit(1)

  const template = templates?.[0]
  if (!template?.versao_atual_id) {
    throw new Error('Nenhum template publicado encontrado.')
  }

  // 4. Busca categorias e itens aplicáveis ao tipo do veículo
  const colunaAplica = `aplica_${veiculo.tipo}` as
    | 'aplica_cavalo' | 'aplica_carreta' | 'aplica_bau'
    | 'aplica_truck' | 'aplica_carro_passeio' | 'aplica_guindaste'

  const { data: categorias, error: errCat } = await supabase
    .from('checklist_categorias')
    .select(`
      id, nome, descricao, ordem,
      checklist_items(
        id, nome, descricao, exige_foto, exige_obs_se_nao_ok, item_critico, ordem, ativo,
        aplica_cavalo, aplica_carreta, aplica_bau, aplica_truck, aplica_carro_passeio, aplica_guindaste
      )
    `)
    .eq('template_version_id', template.versao_atual_id)
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  if (errCat) throw new Error(errCat.message)

  // 5. Filtra itens aplicáveis
  const todoIds: string[] = []
  const categoriasFiltradas = (categorias ?? [])
    .map((cat) => ({
      ...cat,
      checklist_items: (cat.checklist_items ?? [])
        .filter((item) => item.ativo && (item as never as Record<string, boolean>)[colunaAplica])
        .sort((a, b) => a.ordem - b.ordem),
    }))
    .filter((cat) => {
      if (cat.checklist_items.length > 0) {
        cat.checklist_items.forEach((i) => todoIds.push(i.id))
        return true
      }
      return false
    })

  // 6. Busca o estado atual de cada item do veículo
  const { data: estadoAtual, error: errEstado } = await supabase
    .from('veiculo_estado_atual')
    .select(`
      item_id, resposta, observacao, ultima_foto_path, data_atualizacao, quem_atualizou
    `)
    .eq('veiculo_id', agendamento.veiculo_id)
    .in('item_id', todoIds)

  if (errEstado) throw new Error(errEstado.message)

  const estadoMap = new Map(
    (estadoAtual ?? []).map((e) => [e.item_id, e])
  )

  // 7. Motorista ativo vinculado
  const vinculos = veiculo.veiculo_motorista_vinculos as unknown as Array<{
    ativo: boolean
    motoristas: { id: string; nome: string; matricula: string } | null
  }>
  const motoristaAtivo = vinculos?.find((v) => v.ativo)?.motoristas ?? null

  return {
    agendamento,
    veiculo,
    template_version_id: template.versao_atual_id,
    categorias: categoriasFiltradas,
    estadoAtual: estadoMap,
    motoristaAtivo,
  }
}

// ============================================================
// CRIAR AUDITORIA (rascunho para tracking)
// ============================================================

export async function criarAuditoria(
  veiculoId: string,
  templateVersionId: string,
  agendamentoId: string,
  motoristaId?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado.')

  // Evita criar várias auditorias em andamento para o mesmo agendamento
  // quando a tela é recarregada ou aberta mais de uma vez.
  const { data: auditoriaExistente, error: errExistente } = await supabase
    .from('auditorias')
    .select('id, status')
    .eq('agendamento_id', agendamentoId)
    .eq('status', 'em_andamento' as never)
    .maybeSingle()

  if (errExistente) throw new Error(errExistente.message)
  if (auditoriaExistente) return auditoriaExistente

  const { data, error } = await supabase
    .from('auditorias')
    .insert({
      veiculo_id: veiculoId,
      motorista_id: motoristaId || null,
      template_version_id: templateVersionId,
      status: 'em_andamento' as never,
      agendamento_id: agendamentoId,
      responsavel_id: user.id,
      data_inicio: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Vincula o agendamento à auditoria logo no início para rastreabilidade.
  await supabase
    .from('auditoria_agendamentos')
    .update({ auditoria_id: data.id })
    .eq('id', agendamentoId)

  return data
}

// ============================================================
// FINALIZAR AUDITORIA — a operação mais importante do sistema
// ============================================================

export async function finalizarAuditoria(input: FinalizarAuditoriaInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado.')

  try {
    // 1. Atualiza os dados da auditoria
    const { error: errAuditoria } = await supabase
      .from('auditorias')
      .update({
        status: 'concluida' as never,
        km: input.km || null,
        observacoes_gerais: input.observacoes_gerais || null,
        motorista_id: input.motorista_id || null,
        data_conclusao: new Date().toISOString(),
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      })
      .eq('id', input.auditoria_id)

    if (errAuditoria) throw new Error(errAuditoria.message)

    // 2. Processa cada resposta
    for (const resp of input.respostas) {
      // Busca o estado atual para ter o histórico correto
      const { data: estadoAnterior } = await supabase
        .from('veiculo_estado_atual')
        .select('resposta, observacao, ultima_foto_path')
        .eq('veiculo_id', input.veiculo_id)
        .eq('item_id', resp.item_id)
        .single()

      // Salva a resposta da auditoria
      const { data: respostaSalva, error: errResp } = await supabase
        .from('auditoria_respostas')
        .insert({
          auditoria_id: input.auditoria_id,
          item_id: resp.item_id,
          continua_igual: resp.continua_igual,
          resposta_nova: resp.continua_igual ? null : (resp.resposta_nova as never),
          observacao: resp.observacao || null,
          gera_ocorrencia: !resp.continua_igual && resp.resposta_nova === 'nao_ok',
        })
        .select()
        .single()

      if (errResp) throw new Error(errResp.message)

      // Salva fotos se houver
      if (resp.fotos && resp.fotos.length > 0) {
        const fotosPayload = resp.fotos.map((f) => ({
          auditoria_id: input.auditoria_id,
          resposta_id: respostaSalva.id,
          storage_path: f.storage_path,
          nome_original: f.nome_original,
          tamanho_bytes: f.tamanho_bytes,
          mime_type: f.mime_type,
          enviado_por: user.id,
        }))
        const { error: errFotos } = await supabase
          .from('checklist_fotos')
          .insert(fotosPayload)
        if (errFotos) throw new Error(errFotos.message)
      }

      // 3. Atualiza o estado atual apenas se o item mudou
      if (!resp.continua_igual && resp.resposta_nova) {
        const ultimaFotoNova = resp.fotos?.[resp.fotos.length - 1]?.storage_path ?? null

        const { error: errEstado } = await supabase
          .from('veiculo_estado_atual')
          .upsert(
            {
              veiculo_id: input.veiculo_id,
              item_id: resp.item_id,
              resposta: resp.resposta_nova as never,
              observacao: resp.observacao || null,
              ultima_foto_path: ultimaFotoNova,
              atualizado_por_auditoria_id: input.auditoria_id,
              data_atualizacao: new Date().toISOString(),
              quem_atualizou: user.id,
            },
            { onConflict: 'veiculo_id,item_id' }
          )

        if (errEstado) throw new Error(errEstado.message)

        // 4. Registra no histórico imutável
        const { error: errHistorico } = await supabase
          .from('veiculo_estado_historico')
          .insert({
            veiculo_id: input.veiculo_id,
            item_id: resp.item_id,
            resposta_anterior: estadoAnterior?.resposta as never ?? null,
            resposta_nova: resp.resposta_nova as never,
            observacao_anterior: estadoAnterior?.observacao ?? null,
            observacao_nova: resp.observacao || null,
            foto_anterior_path: estadoAnterior?.ultima_foto_path ?? null,
            foto_nova_path: ultimaFotoNova,
            origem: 'auditoria' as never,
            auditoria_id: input.auditoria_id,
            quem_alterou: user.id,
          })

        if (errHistorico) throw new Error(errHistorico.message)

        // 5. Cria ocorrência automática se o item piorou para não_ok
        if (resp.resposta_nova === 'nao_ok') {
          const { data: itemInfo } = await supabase
            .from('checklist_items')
            .select('item_critico')
            .eq('id', resp.item_id)
            .single()

          const { data: ocorrencia, error: errOc } = await supabase
            .from('ocorrencias')
            .insert({
              veiculo_id: input.veiculo_id,
              auditoria_id: input.auditoria_id,
              item_id: resp.item_id,
              descricao: resp.observacao || 'Item identificado como não conforme na auditoria.',
              gravidade: itemInfo?.item_critico ? 'alta' : 'media',
              responsavel: 'frota' as never,
              status: 'aberta' as never,
              aberta_por: user.id,
            })
            .select()
            .single()

          if (errOc) throw new Error(errOc.message)

          await supabase
            .from('auditoria_respostas')
            .update({ ocorrencia_id: ocorrencia.id })
            .eq('id', respostaSalva.id)
        }
      } else if (resp.continua_igual) {
        // Mesmo sem mudança, atualiza a data_atualizacao para rastrear que foi conferido
        const ultimaFotoConfirmada = resp.fotos?.[resp.fotos.length - 1]?.storage_path

        const updatePayload: Record<string, unknown> = {
          data_atualizacao: new Date().toISOString(),
          quem_atualizou: user.id,
          atualizado_por_auditoria_id: input.auditoria_id,
        }
        if (ultimaFotoConfirmada) {
          updatePayload.ultima_foto_path = ultimaFotoConfirmada
        }

        await supabase
          .from('veiculo_estado_atual')
          .update(updatePayload)
          .eq('veiculo_id', input.veiculo_id)
          .eq('item_id', resp.item_id)
      }
    }

    // 6. Atualiza o motorista vinculado se mudou
    if (input.motorista_id) {
      await supabase
        .from('veiculo_motorista_vinculos')
        .update({ ativo: false, data_fim: new Date().toISOString().split('T')[0] })
        .eq('veiculo_id', input.veiculo_id)
        .eq('ativo', true)

      const { data: motoristaAtualVinculo } = await supabase
        .from('veiculo_motorista_vinculos')
        .select('motorista_id')
        .eq('veiculo_id', input.veiculo_id)
        .eq('motorista_id', input.motorista_id)
        .eq('ativo', false)
        .single()

      if (!motoristaAtualVinculo) {
        await supabase.from('veiculo_motorista_vinculos').insert({
          veiculo_id: input.veiculo_id,
          motorista_id: input.motorista_id,
          data_inicio: new Date().toISOString().split('T')[0],
          ativo: true,
        })
      } else {
        await supabase
          .from('veiculo_motorista_vinculos')
          .update({ ativo: true, data_fim: null })
          .eq('veiculo_id', input.veiculo_id)
          .eq('motorista_id', input.motorista_id)
      }
    }

    // 7. Marca o agendamento atual como realizado
    // Usa o agendamento_id salvo na auditoria. O campo auditoria_id do
    // agendamento pode ainda estar nulo em bases antigas, então não usamos
    // apenas auditoria_id como filtro.
    const { data: auditoriaAtual, error: errBuscaAgendamento } = await supabase
      .from('auditorias')
      .select('agendamento_id')
      .eq('id', input.auditoria_id)
      .single()

    if (errBuscaAgendamento) throw new Error(errBuscaAgendamento.message)

    let agendamentoQuery = supabase
      .from('auditoria_agendamentos')
      .update({
        status: 'realizada' as never,
        data_realizada: new Date().toISOString(),
        auditoria_id: input.auditoria_id,
      })

    if (auditoriaAtual?.agendamento_id) {
      agendamentoQuery = agendamentoQuery.eq('id', auditoriaAtual.agendamento_id)
    } else {
      agendamentoQuery = agendamentoQuery.eq('auditoria_id', input.auditoria_id)
    }

    const { error: errAgendamento } = await agendamentoQuery
    if (errAgendamento) throw new Error(errAgendamento.message)

    // 8. Agenda a próxima auditoria (+15 dias)
    const proximaAuditoria = new Date()
    proximaAuditoria.setDate(proximaAuditoria.getDate() + INTERVALO_AUDITORIA_DIAS)
    const dataProxima = proximaAuditoria.toISOString().split('T')[0]

    await supabase.from('auditoria_agendamentos').insert({
      veiculo_id: input.veiculo_id,
      data_agendada: dataProxima,
      status: 'pendente' as never,
    })

    // 9. Atualiza o veículo com km e próxima auditoria
    await supabase
      .from('veiculos')
      .update({
        data_proxima_auditoria: dataProxima,
        km_atual: input.km || undefined,
      })
      .eq('id', input.veiculo_id)

    revalidatePath('/auditorias')
    revalidatePath('/veiculos')
    revalidatePath('/dashboard')
    revalidatePath('/ocorrencias')

    return { auditoria_id: input.auditoria_id, dataProxima }
  } catch (err) {
    // Reverte a auditoria para em_andamento se algo falhou
    await supabase
      .from('auditorias')
      .update({ status: 'em_andamento' as never })
      .eq('id', input.auditoria_id)
    throw err
  }
}

// ============================================================
// LISTAGEM E DETALHES
// ============================================================

export async function listarAuditorias(filtros?: { veiculo_id?: string }) {
  const supabase = await createClient()

  let query = supabase
    .from('auditorias')
    .select(`
      id, status, km, data_inicio, data_conclusao,
      veiculos(id, placa, codigo_frota, tipo),
      motoristas(id, nome)
    `)
    .order('data_conclusao', { ascending: false, nullsFirst: false })
    .limit(100)

  if (filtros?.veiculo_id) query = query.eq('veiculo_id', filtros.veiculo_id)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function buscarAuditoriaCompleta(auditoriaId: string) {
  const supabase = await createClient()

  const { data: auditoria, error: errAuditoria } = await supabase
    .from('auditorias')
    .select(`
      id, status, km, observacoes_gerais, data_inicio, data_conclusao,
      veiculos(id, placa, codigo_frota, tipo, fabricante, modelo),
      motoristas(id, nome, matricula)
    `)
    .eq('id', auditoriaId)
    .single()

  if (errAuditoria) throw new Error(errAuditoria.message)

  const { data: respostas, error: errRespostas } = await supabase
    .from('auditoria_respostas')
    .select(`
      id, continua_igual, resposta_nova, observacao, gera_ocorrencia, ocorrencia_id,
      checklist_items(
        id, nome, item_critico,
        checklist_categorias(nome)
      ),
      checklist_fotos(id, storage_path, nome_original)
    `)
    .eq('auditoria_id', auditoriaId)

  if (errRespostas) throw new Error(errRespostas.message)

  return { auditoria, respostas: respostas ?? [] }
}
