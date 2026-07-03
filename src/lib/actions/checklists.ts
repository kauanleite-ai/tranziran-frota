'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { INTERVALO_AUDITORIA_DIAS } from '@/lib/constants'
import { encaminharOcorrenciaParaManutencao } from '@/lib/email/ocorrencias'

// ============================================================
// TIPOS
// ============================================================

export type RespostaItemInput = {
  item_id: string
  resposta: 'ok' | 'nao_tem' | 'nao_ok' | 'nao_aplica' | null
  observacao?: string
  fotos?: { storage_path: string; nome_original: string; tamanho_bytes: number; mime_type: string }[]
}

export type FinalizarChecklistInput = {
  veiculo_id: string
  motorista_id?: string
  template_version_id: string
  tipo: 'base' | 'saida' | 'retorno'
  km?: number
  observacoes_gerais?: string
  respostas: RespostaItemInput[]
  latitude?: number
  longitude?: number
}

// ============================================================
// INICIAR CHECKLIST — busca veículo + template aplicável
// ============================================================

export async function dadosParaIniciarChecklist(veiculoId: string) {
  const supabase = await createClient()

  const { data: veiculo, error: errVeiculo } = await supabase
    .from('veiculos')
    .select('id, placa, tipo, km_atual, checklist_base_concluido, empresa_id, bloqueado_checklist, status_operacional, bloqueio_motivo, ocorrencia_bloqueante_id')
    .eq('id', veiculoId)
    .single()

  if (errVeiculo) throw new Error(errVeiculo.message)

  if (veiculo.bloqueado_checklist && veiculo.ocorrencia_bloqueante_id) {
    throw new Error(
      `Checklist bloqueado para este veículo. Existe uma ocorrência bloqueante em tratativa. ${veiculo.bloqueio_motivo ?? ''}`
    )
  }

  // Busca o template ativo com versão publicada mais recente
  const { data: templates, error: errTemplates } = await supabase
    .from('checklist_templates')
    .select('id, nome, versao_atual_id')
    .eq('ativo', true)
    .limit(1)

  if (errTemplates) throw new Error(errTemplates.message)
  if (!templates || templates.length === 0) {
    throw new Error('Nenhum template de checklist ativo foi encontrado. Configure um template primeiro.')
  }

  const template = templates[0]

  if (!template.versao_atual_id) {
    throw new Error('O template ativo ainda não possui uma versão publicada.')
  }

  const { data: versao, error: errVersao } = await supabase
    .from('checklist_template_versions')
    .select('id, versao, publicado')
    .eq('id', template.versao_atual_id)
    .single()

  if (errVersao) throw new Error(errVersao.message)
  if (!versao.publicado) {
    throw new Error('A versão atual do template não está publicada.')
  }

  // Busca categorias e itens aplicáveis ao tipo deste veículo
  const colunaAplica = `aplica_${veiculo.tipo}` as
    | 'aplica_cavalo' | 'aplica_carreta' | 'aplica_bau'
    | 'aplica_truck' | 'aplica_carro_passeio' | 'aplica_guindaste'

  const { data: categorias, error: errCategorias } = await supabase
    .from('checklist_categorias')
    .select(`
      id, nome, descricao, ordem,
      checklist_items(
        id, nome, descricao, tipo_resposta, exige_foto, exige_obs_se_nao_ok,
        item_critico, ordem, ativo,
        aplica_cavalo, aplica_carreta, aplica_bau, aplica_truck, aplica_carro_passeio, aplica_guindaste
      )
    `)
    .eq('template_version_id', template.versao_atual_id)
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  if (errCategorias) throw new Error(errCategorias.message)

  // Campos como data, hora, placa, km, motorista, matrícula e tipo de movimentação
  // são metadados do checklist. Eles são preenchidos na tela inicial e salvos
  // diretamente no registro do checklist, portanto não devem aparecer como perguntas.
  const categoriasMetadados = new Set(['dados gerais'])
  const itensMetadados = new Set([
    'data do checklist',
    'hora do checklist',
    'placa / identificação do veículo',
    'placa / identificacao do veiculo',
    'km / horímetro',
    'km / horimetro',
    'motorista / operador',
    'matrícula',
    'matricula',
    'tipo de movimentação: saída ou retorno',
    'tipo de movimentacao: saida ou retorno',
  ])

  const normalizarNome = (valor: string) =>
    valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()

  // Filtra apenas itens ativos, aplicáveis ao tipo do veículo e que sejam perguntas reais.
  const categoriasFiltradas = (categorias ?? [])
    .filter((cat) => !categoriasMetadados.has(normalizarNome(cat.nome)))
    .map((cat) => ({
      ...cat,
      checklist_items: (cat.checklist_items ?? [])
        .filter((item) => {
          const nomeNormalizado = normalizarNome(item.nome)
          return (
            item.ativo &&
            (item as never as Record<string, boolean>)[colunaAplica] &&
            !itensMetadados.has(nomeNormalizado)
          )
        })
        .sort((a, b) => a.ordem - b.ordem),
    }))
    .filter((cat) => cat.checklist_items.length > 0)

  const totalItens = categoriasFiltradas.reduce((acc, c) => acc + c.checklist_items.length, 0)
  if (totalItens === 0) {
    throw new Error(`O template não possui itens aplicáveis ao tipo de veículo "${veiculo.tipo}".`)
  }

  return {
    veiculo,
    template_version_id: template.versao_atual_id,
    template_nome: template.nome,
    versao: versao.versao,
    categorias: categoriasFiltradas,
  }
}

// ============================================================
// FINALIZAR CHECKLIST — transação completa
// ============================================================

export async function finalizarChecklist(input: FinalizarChecklistInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado.')

  // 1. Cria o checklist
  const { data: checklist, error: errChecklist } = await supabase
    .from('checklists')
    .insert({
      veiculo_id: input.veiculo_id,
      motorista_id: input.motorista_id || null,
      template_version_id: input.template_version_id,
      tipo: input.tipo as never,
      status: 'concluido' as never,
      km: input.km || null,
      observacoes_gerais: input.observacoes_gerais || null,
      responsavel_id: user.id,
      data_inicio: new Date().toISOString(),
      data_conclusao: new Date().toISOString(),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    })
    .select()
    .single()

  if (errChecklist) throw new Error(`Erro ao criar checklist: ${errChecklist.message}`)

  const checklistId = checklist.id

  try {
    // 2. Insere as respostas
    for (const resp of input.respostas) {
      const { data: respostaSalva, error: errResp } = await supabase
        .from('checklist_respostas')
        .insert({
          checklist_id: checklistId,
          item_id: resp.item_id,
          resposta: resp.resposta as never,
          observacao: resp.observacao || null,
          gera_ocorrencia: resp.resposta === 'nao_ok',
        })
        .select()
        .single()

      if (errResp) throw new Error(`Erro ao salvar resposta: ${errResp.message}`)

      // 3. Salva referências de fotos já enviadas ao Storage
      if (resp.fotos && resp.fotos.length > 0) {
        const fotosPayload = resp.fotos.map((f) => ({
          checklist_id: checklistId,
          resposta_id: respostaSalva.id,
          storage_path: f.storage_path,
          nome_original: f.nome_original,
          tamanho_bytes: f.tamanho_bytes,
          mime_type: f.mime_type,
          enviado_por: user.id,
        }))

        const { error: errFotos } = await supabase.from('checklist_fotos').insert(fotosPayload)
        if (errFotos) throw new Error(`Erro ao salvar fotos: ${errFotos.message}`)
      }

      // 4. Cria o estado atual do veículo para este item (upsert)
      if (resp.resposta) {
        const ultimaFoto = resp.fotos?.[resp.fotos.length - 1]?.storage_path ?? null

        const { error: errEstado } = await supabase
          .from('veiculo_estado_atual')
          .upsert(
            {
              veiculo_id: input.veiculo_id,
              item_id: resp.item_id,
              resposta: resp.resposta as never,
              observacao: resp.observacao || null,
              ultima_foto_path: ultimaFoto,
              atualizado_por_checklist_id: checklistId,
              data_atualizacao: new Date().toISOString(),
              quem_atualizou: user.id,
            },
            { onConflict: 'veiculo_id,item_id' }
          )

        if (errEstado) throw new Error(`Erro ao registrar estado do veículo: ${errEstado.message}`)

        // 5. Registra no histórico imutável
        const { error: errHistorico } = await supabase
          .from('veiculo_estado_historico')
          .insert({
            veiculo_id: input.veiculo_id,
            item_id: resp.item_id,
            resposta_anterior: null,
            resposta_nova: resp.resposta as never,
            observacao_anterior: null,
            observacao_nova: resp.observacao || null,
            foto_anterior_path: null,
            foto_nova_path: ultimaFoto,
            origem: 'checklist_base' as never,
            checklist_id: checklistId,
            quem_alterou: user.id,
          })

        if (errHistorico) throw new Error(`Erro ao registrar histórico: ${errHistorico.message}`)
      }

      // 6. Cria ocorrência automática se o item não estiver OK
      if (resp.resposta === 'nao_ok') {
        const { data: itemInfo } = await supabase
          .from('checklist_items')
          .select('item_critico')
          .eq('id', resp.item_id)
          .single()

        const { data: ocorrencia, error: errOcorrencia } = await supabase
          .from('ocorrencias')
          .insert({
            veiculo_id: input.veiculo_id,
            checklist_id: checklistId,
            item_id: resp.item_id,
            descricao: resp.observacao || 'Item identificado como não conforme no checklist base.',
            gravidade: itemInfo?.item_critico ? 'alta' : 'media',
            responsavel: 'frota' as never,
            status: 'aberta' as never,
            status_tratativa: 'nao_conformidade_aberta',
            bloqueante: true,
            aberta_por: user.id,
          })
          .select()
          .single()

        if (errOcorrencia) throw new Error(`Erro ao criar ocorrência: ${errOcorrencia.message}`)

        // Vincula a ocorrência de volta à resposta e às fotos daquele item.
        // Sem isso, a ocorrência é aberta corretamente, mas a tela de detalhes
        // não consegue exibir as fotos tiradas no checklist.
        await supabase
          .from('checklist_respostas')
          .update({ ocorrencia_id: ocorrencia.id })
          .eq('id', respostaSalva.id)

        await supabase
          .from('checklist_fotos')
          .update({ ocorrencia_id: ocorrencia.id })
          .eq('resposta_id', respostaSalva.id)

        await encaminharOcorrenciaParaManutencao(ocorrencia.id)
      }
    }

    // 7. Calcula a próxima data de auditoria (+15 dias)
    const proximaAuditoria = new Date()
    proximaAuditoria.setDate(proximaAuditoria.getDate() + INTERVALO_AUDITORIA_DIAS)
    const dataProximaAuditoria = proximaAuditoria.toISOString().split('T')[0]

    // 8. Atualiza o veículo: marca checklist base concluído + agenda auditoria
    const { error: errVeiculo } = await supabase
      .from('veiculos')
      .update({
        checklist_base_concluido: true,
        data_checklist_base: new Date().toISOString(),
        data_proxima_auditoria: dataProximaAuditoria,
        km_atual: input.km || undefined,
      })
      .eq('id', input.veiculo_id)

    if (errVeiculo) throw new Error(`Erro ao atualizar veículo: ${errVeiculo.message}`)

    // 9. Cria o agendamento formal da primeira auditoria
    const { error: errAgendamento } = await supabase
      .from('auditoria_agendamentos')
      .insert({
        veiculo_id: input.veiculo_id,
        data_agendada: dataProximaAuditoria,
        status: 'pendente' as never,
      })

    if (errAgendamento) throw new Error(`Erro ao agendar auditoria: ${errAgendamento.message}`)

    // 10. Vincula o motorista ao veículo, se informado
    if (input.motorista_id) {
      await supabase
        .from('veiculo_motorista_vinculos')
        .update({ ativo: false, data_fim: new Date().toISOString().split('T')[0] })
        .eq('veiculo_id', input.veiculo_id)
        .eq('ativo', true)

      await supabase.from('veiculo_motorista_vinculos').insert({
        veiculo_id: input.veiculo_id,
        motorista_id: input.motorista_id,
        data_inicio: new Date().toISOString().split('T')[0],
        ativo: true,
      })
    }

    revalidatePath('/checklists')
    revalidatePath('/veiculos')
    revalidatePath(`/veiculos/${input.veiculo_id}`)
    revalidatePath('/dashboard')
    revalidatePath('/ocorrencias')

    return { checklistId, dataProximaAuditoria }
  } catch (err) {
    // Rollback manual: remove o checklist criado se algo falhar no meio do processo
    await supabase.from('checklists').delete().eq('id', checklistId)
    throw err
  }
}

// ============================================================
// LISTAGEM E DETALHES
// ============================================================

export async function listarChecklists(filtros?: { veiculo_id?: string; tipo?: string }) {
  const supabase = await createClient()

  let query = supabase
    .from('checklists')
    .select(`
      id, tipo, status, km, data_inicio, data_conclusao,
      veiculos(id, placa, codigo_frota, tipo),
      motoristas(id, nome, matricula)
    `)
    .order('data_conclusao', { ascending: false, nullsFirst: false })
    .limit(100)

  if (filtros?.veiculo_id) query = query.eq('veiculo_id', filtros.veiculo_id)
  if (filtros?.tipo) query = query.eq('tipo', filtros.tipo)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function buscarChecklistCompleto(checklistId: string) {
  const supabase = await createClient()

  const { data: checklist, error: errChecklist } = await supabase
    .from('checklists')
    .select(`
      id, tipo, status, km, observacoes_gerais, data_inicio, data_conclusao,
      latitude, longitude,
      veiculos(id, placa, codigo_frota, tipo, fabricante, modelo),
      motoristas(id, nome, matricula)
    `)
    .eq('id', checklistId)
    .single()

  if (errChecklist) throw new Error(errChecklist.message)

  const { data: respostas, error: errRespostas } = await supabase
    .from('checklist_respostas')
    .select(`
      id, resposta, observacao, gera_ocorrencia, ocorrencia_id,
      checklist_items(id, nome, categoria_id, item_critico,
        checklist_categorias(nome)
      ),
      checklist_fotos(id, storage_path, nome_original)
    `)
    .eq('checklist_id', checklistId)

  if (errRespostas) throw new Error(errRespostas.message)

  return { checklist, respostas: respostas ?? [] }
}

// ============================================================
// VEÍCULOS PENDENTES DE CHECKLIST BASE
// ============================================================

export async function listarVeiculosSemChecklistBase() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('veiculos')
    .select('id, placa, codigo_frota, tipo, status')
    .eq('checklist_base_concluido', false)
    .eq('status', 'ativo')
    .order('placa')

  if (error) throw new Error(error.message)
  return data ?? []
}
