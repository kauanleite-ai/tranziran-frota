'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type AcaoDevolutivaManutencao =
  | 'em_analise'
  | 'solicitar_oficina'
  | 'em_oficina'
  | 'resolvido'
  | 'mais_informacoes'

function diffDias(inicio?: string | null, fim?: string | null) {
  if (!inicio || !fim) return null
  const ms = new Date(fim).getTime() - new Date(inicio).getTime()
  if (Number.isNaN(ms) || ms < 0) return null
  return Math.round((ms / 1000 / 60 / 60 / 24) * 100) / 100
}

export async function buscarOcorrenciaPorToken(token: string) {
  const supabase = createAdminClient()

  const { data: acesso, error: errAcesso } = await supabase
    .from('ocorrencia_acessos_manutencao')
    .select('id, token, ativo, expira_em, ocorrencia_id')
    .eq('token', token)
    .maybeSingle()

  if (errAcesso) throw new Error(errAcesso.message)
  if (!acesso || !acesso.ativo) throw new Error('Link de manutenção inválido ou inativo.')
  if (acesso.expira_em && new Date(acesso.expira_em) < new Date()) {
    throw new Error('Link de manutenção expirado. Solicite um novo encaminhamento à Frota.')
  }

  const { data: ocorrencia, error: errOcorrencia } = await supabase
    .from('ocorrencias')
    .select(`
      id, numero, descricao, gravidade, status, status_tratativa, criado_em,
      data_encaminhado_manutencao, data_solicitado_oficina, data_entrada_oficina, data_saida_oficina,
      veiculos(id, placa, codigo_frota, tipo, fabricante, modelo),
      checklist_items(id, nome, item_critico, checklist_categorias(nome))
    `)
    .eq('id', acesso.ocorrencia_id)
    .single()

  if (errOcorrencia) throw new Error(errOcorrencia.message)

  const { data: fotos } = await supabase
    .from('checklist_fotos')
    .select('id, storage_path, nome_original, criado_em')
    .eq('ocorrencia_id', acesso.ocorrencia_id)
    .order('criado_em', { ascending: true })

  const fotosComUrl = []
  for (const foto of fotos ?? []) {
    const { data } = await supabase.storage
      .from('checklist-fotos')
      .createSignedUrl(foto.storage_path, 60 * 60 * 24)
    fotosComUrl.push({ ...foto, url: data?.signedUrl ?? '' })
  }

  return { acesso, ocorrencia, fotos: fotosComUrl }
}

export async function registrarDevolutivaManutencao(input: {
  token: string
  acao: AcaoDevolutivaManutencao
  observacao: string
}) {
  const supabase = createAdminClient()
  const agora = new Date().toISOString()

  const { data: acesso, error: errAcesso } = await supabase
    .from('ocorrencia_acessos_manutencao')
    .select('id, ativo, expira_em, ocorrencia_id')
    .eq('token', input.token)
    .maybeSingle()

  if (errAcesso) throw new Error(errAcesso.message)
  if (!acesso || !acesso.ativo) throw new Error('Link inválido ou inativo.')
  if (acesso.expira_em && new Date(acesso.expira_em) < new Date()) {
    throw new Error('Link expirado.')
  }

  const { data: ocorrencia, error: errOcorrencia } = await supabase
    .from('ocorrencias')
    .select('id, numero, status, status_tratativa, veiculo_id, criado_em, data_entrada_oficina')
    .eq('id', acesso.ocorrencia_id)
    .single()

  if (errOcorrencia || !ocorrencia) throw new Error(errOcorrencia?.message ?? 'Ocorrência não encontrada.')

  let status = ocorrencia.status
  let statusTratativa = ocorrencia.status_tratativa
  let statusVeiculo = 'encaminhado_manutencao'
  const payload: Record<string, unknown> = {
    data_devolutiva_manutencao: agora,
    devolutiva_manutencao: input.observacao.trim(),
  }

  switch (input.acao) {
    case 'em_analise':
      status = 'em_analise'
      statusTratativa = 'em_analise_manutencao'
      statusVeiculo = 'encaminhado_manutencao'
      break
    case 'solicitar_oficina':
      status = 'em_analise'
      statusTratativa = 'aguardando_envio_oficina'
      statusVeiculo = 'aguardando_envio_oficina'
      payload.data_solicitado_oficina = agora
      break
    case 'em_oficina':
      status = 'em_analise'
      statusTratativa = 'em_oficina'
      statusVeiculo = 'em_oficina'
      payload.data_entrada_oficina = ocorrencia.data_entrada_oficina ?? agora
      break
    case 'resolvido':
      status = 'em_analise'
      statusTratativa = 'resolvido_aguardando_validacao'
      statusVeiculo = 'resolvido_aguardando_validacao'
      payload.data_saida_oficina = agora
      payload.dias_em_oficina = diffDias(ocorrencia.data_entrada_oficina, agora)
      break
    case 'mais_informacoes':
      status = 'aguardando_manutencao'
      statusTratativa = 'aguardando_devolutiva_manutencao'
      statusVeiculo = 'encaminhado_manutencao'
      break
  }

  payload.status = status
  payload.status_tratativa = statusTratativa

  const { error: errUpdate } = await supabase
    .from('ocorrencias')
    .update(payload)
    .eq('id', ocorrencia.id)

  if (errUpdate) throw new Error(errUpdate.message)

  await supabase.from('ocorrencia_email_logs').insert({
    ocorrencia_id: ocorrencia.id,
    destinatarios: [],
    assunto: 'Devolutiva registrada pela manutenção',
    corpo_html: input.observacao.trim(),
    status: `devolutiva_${input.acao}`,
    provider: 'link_manutencao',
  })

  await supabase
    .from('veiculos')
    .update({
      status_operacional: statusVeiculo,
      bloqueado_checklist: true,
      ocorrencia_bloqueante_id: ocorrencia.id,
      bloqueio_motivo: `Ocorrência OC-${ocorrencia.numero}: ${input.observacao.trim()}`,
    })
    .eq('id', ocorrencia.veiculo_id)

  await supabase
    .from('ocorrencia_acessos_manutencao')
    .update({ usado_em: agora })
    .eq('id', acesso.id)

  revalidatePath(`/manutencao/ocorrencias/${input.token}`)
  return { ok: true, statusTratativa }
}
