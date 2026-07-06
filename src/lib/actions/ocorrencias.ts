'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { INTERVALO_AUDITORIA_DIAS } from '@/lib/constants'
import nodemailer from 'nodemailer'
import { randomUUID } from 'crypto'

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

type FotoOcorrencia = {
  id: string
  storage_path: string
  nome_original: string
  criado_em: string
}

type OcorrenciaBase = {
  id: string
  numero: number
  descricao: string
  gravidade: string
  responsavel: string
  prazo: string | null
  status: string
  status_tratativa: string | null
  bloqueante: boolean | null
  email_status: string | null
  email_erro?: string | null
  email_enviado_em: string | null
  email_destinatarios?: string | null
  protocolo_email?: string | null
  token_manutencao?: string | null
  data_encaminhado_manutencao?: string | null
  data_devolutiva_manutencao?: string | null
  data_solicitado_oficina?: string | null
  data_entrada_oficina?: string | null
  data_saida_oficina?: string | null
  data_validacao_frota?: string | null
  dias_em_oficina?: number | null
  dias_pendencia_total?: number | null
  devolutiva_manutencao?: string | null
  criado_em: string
  data_resolucao: string | null
  veiculo_id: string
  checklist_id: string | null
  auditoria_id: string | null
  item_id: string | null
}

type VeiculoResumo = {
  id: string
  placa: string
  codigo_frota: string | null
  tipo: string
  fabricante?: string | null
  modelo?: string | null
}

type ItemResumo = {
  id: string
  nome: string
  item_critico?: boolean | null
  checklist_categorias?: { nome: string } | null
}

// ============================================================
// HELPERS
// ============================================================

function calcularDiasEntre(inicio?: string | null, fim?: string | null) {
  if (!inicio || !fim) return null

  const ms = new Date(fim).getTime() - new Date(inicio).getTime()

  if (Number.isNaN(ms) || ms < 0) return null

  return Math.round((ms / 1000 / 60 / 60 / 24) * 100) / 100
}

function normalizarSenhaSMTP(senha?: string) {
  return (senha ?? '').replace(/\s+/g, '').trim()
}

function htmlEscape(valor: unknown) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function buscarVeiculoPorId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  veiculoId?: string | null
) {
  if (!veiculoId) return null

  const { data, error } = await supabase
    .from('veiculos')
    .select('id, placa, codigo_frota, tipo, fabricante, modelo')
    .eq('id', veiculoId)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar veículo:', error)
    return null
  }

  return data as VeiculoResumo | null
}

async function buscarItemPorId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemId?: string | null
) {
  if (!itemId) return null

  const { data, error } = await supabase
    .from('checklist_items')
    .select(`
      id,
      nome,
      item_critico,
      checklist_categorias (
        nome
      )
    `)
    .eq('id', itemId)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar item:', error)
    return null
  }

  const item = data as unknown as ItemResumo | ItemResumo[] | null

  if (Array.isArray(item)) return item[0] ?? null

  return item
}

async function enriquecerOcorrencias(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ocorrencias: OcorrenciaBase[]
) {
  const veiculoIds = [
    ...new Set(ocorrencias.map((o) => o.veiculo_id).filter(Boolean)),
  ]

  const itemIds = [
    ...new Set(ocorrencias.map((o) => o.item_id).filter(Boolean)),
  ]

  const veiculosMap = new Map<string, VeiculoResumo>()
  const itensMap = new Map<string, ItemResumo>()

  if (veiculoIds.length > 0) {
    const { data: veiculos, error } = await supabase
      .from('veiculos')
      .select('id, placa, codigo_frota, tipo, fabricante, modelo')
      .in('id', veiculoIds)

    if (error) {
      console.error('Erro ao buscar veículos da listagem:', error)
    }

    for (const veiculo of (veiculos ?? []) as VeiculoResumo[]) {
      veiculosMap.set(veiculo.id, veiculo)
    }
  }

  if (itemIds.length > 0) {
    const { data: itens, error } = await supabase
      .from('checklist_items')
      .select('id, nome, item_critico')
      .in('id', itemIds)

    if (error) {
      console.error('Erro ao buscar itens da listagem:', error)
    }

    for (const item of (itens ?? []) as ItemResumo[]) {
      itensMap.set(item.id, item)
    }
  }

  return ocorrencias.map((ocorrencia) => ({
    ...ocorrencia,
    veiculos: veiculosMap.get(ocorrencia.veiculo_id) ?? null,
    checklist_items: ocorrencia.item_id
      ? itensMap.get(ocorrencia.item_id) ?? null
      : null,
  }))
}

async function buscarFotosDaOcorrencia(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ocorrencia: Pick<
    OcorrenciaBase,
    'id' | 'checklist_id' | 'auditoria_id' | 'item_id'
  >
) {
  const fotosMap = new Map<string, FotoOcorrencia>()

  const { data: fotosDiretas } = await supabase
    .from('checklist_fotos')
    .select('id, storage_path, nome_original, criado_em')
    .eq('ocorrencia_id', ocorrencia.id)
    .order('criado_em', { ascending: true })

  for (const foto of (fotosDiretas ?? []) as FotoOcorrencia[]) {
    fotosMap.set(foto.id, foto)
  }

  if (ocorrencia.item_id && ocorrencia.checklist_id) {
    const { data: respostasOrigem } = await supabase
      .from('checklist_respostas')
      .select('id')
      .eq('checklist_id', ocorrencia.checklist_id)
      .eq('item_id', ocorrencia.item_id)

    const respostaIds = (respostasOrigem ?? []).map((r) => r.id)

    if (respostaIds.length > 0) {
      const { data: fotosOrigem } = await supabase
        .from('checklist_fotos')
        .select('id, storage_path, nome_original, criado_em')
        .in('resposta_id', respostaIds)
        .order('criado_em', { ascending: true })

      for (const foto of (fotosOrigem ?? []) as FotoOcorrencia[]) {
        fotosMap.set(foto.id, foto)
      }
    }
  }

  if (ocorrencia.item_id && ocorrencia.auditoria_id) {
    const { data: respostasOrigem } = await supabase
      .from('auditoria_respostas')
      .select('id')
      .eq('auditoria_id', ocorrencia.auditoria_id)
      .eq('item_id', ocorrencia.item_id)

    const respostaIds = (respostasOrigem ?? []).map((r) => r.id)

    if (respostaIds.length > 0) {
      const { data: fotosOrigem } = await supabase
        .from('checklist_fotos')
        .select('id, storage_path, nome_original, criado_em')
        .in('resposta_id', respostaIds)
        .order('criado_em', { ascending: true })

      for (const foto of (fotosOrigem ?? []) as FotoOcorrencia[]) {
        fotosMap.set(foto.id, foto)
      }
    }
  }

  return [...fotosMap.values()].sort(
    (a, b) =>
      new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
  )
}

async function gerarLinksFotos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fotos: FotoOcorrencia[]
) {
  const links: { nome: string; url: string }[] = []

  for (const foto of fotos) {
    const { data, error } = await supabase.storage
      .from('checklist-fotos')
      .createSignedUrl(foto.storage_path, 60 * 60 * 24 * 7)

    if (error || !data?.signedUrl) {
      console.error('Erro ao gerar link assinado da foto:', error)
      continue
    }

    links.push({
      nome: foto.nome_original,
      url: data.signedUrl,
    })
  }

  return links
}

async function enviarEmailSMTP({
  to,
  subject,
  html,
}: {
  to: string[]
  subject: string
  html: string
}) {
  const smtpUser = process.env.SMTP_USER
  const smtpPass = normalizarSenhaSMTP(process.env.SMTP_PASS)

  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP_USER ou SMTP_PASS não configurado na Vercel.')
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE ?? 'true') === 'true',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })

  const result = await transporter.sendMail({
    from: process.env.EMAIL_FROM || `Tranziran Frota <${smtpUser}>`,
    to,
    subject,
    html,
  })

  return result
}

async function encaminharOcorrenciaParaManutencaoSeguro(
  ocorrenciaId: string,
  opcoes?: { falharAoErro?: boolean }
) {
  const supabase = await createClient()

  const { data: ocorrenciaRaw, error } = await supabase
    .from('ocorrencias')
    .select(`
      id,
      numero,
      descricao,
      gravidade,
      responsavel,
      prazo,
      status,
      status_tratativa,
      bloqueante,
      email_status,
      email_erro,
      email_enviado_em,
      email_destinatarios,
      protocolo_email,
      token_manutencao,
      veiculo_id,
      checklist_id,
      auditoria_id,
      item_id,
      criado_em
    `)
    .eq('id', ocorrenciaId)
    .maybeSingle()

  if (error || !ocorrenciaRaw) {
    console.error('Erro ao buscar ocorrência para envio de e-mail:', error)
    throw new Error('Ocorrência não encontrada para envio de e-mail.')
  }

  const ocorrencia =
    ocorrenciaRaw as OcorrenciaBase & { token_manutencao?: string | null }

  const veiculo = await buscarVeiculoPorId(supabase, ocorrencia.veiculo_id)
  const item = await buscarItemPorId(supabase, ocorrencia.item_id)
  const fotos = await buscarFotosDaOcorrencia(supabase, ocorrencia)
  const linksFotos = await gerarLinksFotos(supabase, fotos)

  const destinatarios = (process.env.MANUTENCAO_EMAILS || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)

  if (destinatarios.length === 0) {
    await supabase
      .from('ocorrencias')
      .update({
        email_status: 'erro',
        email_erro: 'MANUTENCAO_EMAILS não configurado.',
      })
      .eq('id', ocorrenciaId)

    throw new Error('MANUTENCAO_EMAILS não configurado na Vercel.')
  }

  const token = ocorrencia.token_manutencao || randomUUID()
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://tranziran-frota.vercel.app'

  const linkDevolutiva = `${appUrl}/manutencao/ocorrencias/${token}`
  const linkOcorrencia = `${appUrl}/ocorrencias/${ocorrencia.id}`

  const fotosHtml =
    linksFotos.length > 0
      ? linksFotos
          .map(
            (foto, index) => `
              <li>
                <a href="${foto.url}" target="_blank" rel="noreferrer">
                  Foto ${index + 1} - ${htmlEscape(foto.nome)}
                </a>
              </li>
            `
          )
          .join('')
      : '<li>Sem fotos vinculadas.</li>'

  const placa = veiculo?.placa ?? 'Sem placa'
  const assunto = `[OC-${ocorrencia.numero}] Não conformidade — Veículo ${placa}`

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
      <h2>Ocorrência #${htmlEscape(ocorrencia.numero)} — Não conformidade identificada</h2>

      <p>Foi registrada uma não conformidade no sistema de checklist da frota.</p>

      <table style="border-collapse:collapse;width:100%;max-width:760px">
        <tr>
          <td style="border:1px solid #e2e8f0;padding:8px;font-weight:bold">Veículo</td>
          <td style="border:1px solid #e2e8f0;padding:8px">${htmlEscape(placa)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #e2e8f0;padding:8px;font-weight:bold">Frota</td>
          <td style="border:1px solid #e2e8f0;padding:8px">${htmlEscape(veiculo?.codigo_frota ?? '—')}</td>
        </tr>
        <tr>
          <td style="border:1px solid #e2e8f0;padding:8px;font-weight:bold">Tipo</td>
          <td style="border:1px solid #e2e8f0;padding:8px">${htmlEscape(veiculo?.tipo ?? '—')}</td>
        </tr>
        <tr>
          <td style="border:1px solid #e2e8f0;padding:8px;font-weight:bold">Item não conforme</td>
          <td style="border:1px solid #e2e8f0;padding:8px">${htmlEscape(item?.nome ?? '—')}</td>
        </tr>
        <tr>
          <td style="border:1px solid #e2e8f0;padding:8px;font-weight:bold">Descrição</td>
          <td style="border:1px solid #e2e8f0;padding:8px">${htmlEscape(ocorrencia.descricao)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #e2e8f0;padding:8px;font-weight:bold">Gravidade</td>
          <td style="border:1px solid #e2e8f0;padding:8px">${htmlEscape(ocorrencia.gravidade)}</td>
        </tr>
      </table>

      <h3>Evidências fotográficas</h3>
      <ul>
        ${fotosHtml}
      </ul>

      <p style="margin-top:24px">
        <a
          href="${linkDevolutiva}"
          target="_blank"
          rel="noreferrer"
          style="background:#2563eb;color:white;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block;font-weight:bold"
        >
          Registrar devolutiva da manutenção
        </a>
      </p>

      <p>
        Link administrativo da ocorrência:
        <br />
        <a href="${linkOcorrencia}" target="_blank" rel="noreferrer">${linkOcorrencia}</a>
      </p>

      <p style="font-size:12px;color:#64748b;margin-top:24px">
        Sistema Tranziran Frota & Auditoria
      </p>
    </div>
  `

  try {
    const resultado = await enviarEmailSMTP({
      to: destinatarios,
      subject: assunto,
      html,
    })

    const agora = new Date().toISOString()

    await supabase
      .from('ocorrencias')
      .update({
        status: 'aguardando_manutencao',
        status_tratativa: 'encaminhado_manutencao',
        token_manutencao: token,
        email_status: 'enviado',
        email_erro: null,
        email_destinatarios: destinatarios.join(','),
        email_enviado_em: agora,
        protocolo_email: resultado.messageId ?? null,
        data_encaminhado_manutencao: agora,
      })
      .eq('id', ocorrenciaId)

    await supabase.from('ocorrencia_historico').insert({
      ocorrencia_id: ocorrenciaId,
      status_anterior: ocorrencia.status as never,
      status_novo: 'aguardando_manutencao' as never,
      observacao: `Ocorrência encaminhada para manutenção por e-mail. Destinatários: ${destinatarios.join(', ')}`,
      feito_por: null,
    })

    if (ocorrencia.veiculo_id) {
      await supabase
        .from('veiculos')
        .update({
          status_operacional: 'encaminhado_manutencao',
          bloqueado_checklist: true,
          ocorrencia_bloqueante_id: ocorrenciaId,
          bloqueio_motivo: `Ocorrência #${ocorrencia.numero} encaminhada para manutenção.`,
        })
        .eq('id', ocorrencia.veiculo_id)
    }

    return {
      ok: true,
      messageId: resultado.messageId,
    }
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro)

    await supabase
      .from('ocorrencias')
      .update({
        email_status: 'erro',
        email_erro: mensagem,
      })
      .eq('id', ocorrenciaId)

    if (opcoes?.falharAoErro === false) {
      console.error('Erro ao enviar e-mail de manutenção:', mensagem)

      return {
        ok: false,
        erro: mensagem,
      }
    }

    throw new Error(mensagem)
  }
}

// ============================================================
// LISTAGEM
// ============================================================

export async function listarOcorrencias(filtros?: FiltrosOcorrencia) {
  const supabase = await createClient()

  let query = supabase
    .from('ocorrencias')
    .select(`
      id,
      numero,
      descricao,
      gravidade,
      responsavel,
      prazo,
      status,
      status_tratativa,
      bloqueante,
      email_status,
      email_enviado_em,
      data_entrada_oficina,
      data_saida_oficina,
      criado_em,
      data_resolucao,
      checklist_id,
      auditoria_id,
      item_id,
      veiculo_id
    `)
    .order('criado_em', { ascending: false })
    .limit(200)

  if (filtros?.status) query = query.eq('status', filtros.status)
  if (filtros?.gravidade) query = query.eq('gravidade', filtros.gravidade)
  if (filtros?.responsavel) query = query.eq('responsavel', filtros.responsavel)
  if (filtros?.veiculo_id) query = query.eq('veiculo_id', filtros.veiculo_id)

  const { data, error } = await query

  if (error) throw new Error(error.message)

  let ocorrencias = await enriquecerOcorrencias(
    supabase,
    (data ?? []) as OcorrenciaBase[]
  )

  if (filtros?.busca) {
    const termo = filtros.busca.toLowerCase().trim()

    ocorrencias = ocorrencias.filter((o) => {
      return (
        o.descricao.toLowerCase().includes(termo) ||
        (o.veiculos?.placa ?? '').toLowerCase().includes(termo) ||
        (o.veiculos?.codigo_frota ?? '').toLowerCase().includes(termo) ||
        (o.checklist_items?.nome ?? '').toLowerCase().includes(termo) ||
        String(o.numero).includes(termo)
      )
    })
  }

  return ocorrencias
}

export async function contadoresOcorrencias() {
  const supabase = await createClient()

  const statusEncerrados = ['resolvida', 'reprovada', 'cancelada']
  const statusTratativaEncerrados = [
    'validada_liberada',
    'liberado_apos_validacao',
    'liberada_apos_validacao',
    'cancelada',
  ]

  const { data, error } = await supabase
    .from('ocorrencias')
    .select('status, gravidade, status_tratativa')
    .limit(1000)

  if (error) throw new Error(error.message)

  const ocorrencias = data ?? []

  const emAberto = ocorrencias.filter((o) => {
    const statusTratativa = o.status_tratativa ?? ''

    return (
      !statusEncerrados.includes(o.status) &&
      !statusTratativaEncerrados.includes(statusTratativa)
    )
  })

  return {
    abertas: emAberto.length,
    criticas: emAberto.filter((o) => o.gravidade === 'critica').length,
    emAnalise: emAberto.filter(
      (o) =>
        o.status === 'em_analise' ||
        o.status_tratativa === 'em_analise_manutencao'
    ).length,
    aguardando: emAberto.filter(
      (o) =>
        o.status === 'aguardando_manutencao' ||
        [
          'encaminhado_manutencao',
          'aguardando_devolutiva_manutencao',
          'aguardando_envio_oficina',
        ].includes(o.status_tratativa ?? '')
    ).length,
  }
}

// ============================================================
// DETALHES
// ============================================================

export async function buscarOcorrencia(id: string) {
  const supabase = await createClient()

  const { data: ocorrenciaRaw, error } = await supabase
    .from('ocorrencias')
    .select(`
      id,
      numero,
      descricao,
      gravidade,
      responsavel,
      prazo,
      status,
      status_tratativa,
      bloqueante,
      email_status,
      email_erro,
      email_enviado_em,
      email_destinatarios,
      protocolo_email,
      data_encaminhado_manutencao,
      data_devolutiva_manutencao,
      data_solicitado_oficina,
      data_entrada_oficina,
      data_saida_oficina,
      data_validacao_frota,
      dias_em_oficina,
      dias_pendencia_total,
      devolutiva_manutencao,
      criado_em,
      data_resolucao,
      checklist_id,
      auditoria_id,
      item_id,
      veiculo_id
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)

  const ocorrenciaBase = ocorrenciaRaw as OcorrenciaBase

  const veiculo = await buscarVeiculoPorId(supabase, ocorrenciaBase.veiculo_id)
  const item = await buscarItemPorId(supabase, ocorrenciaBase.item_id)

  const { data: checklist } = ocorrenciaBase.checklist_id
    ? await supabase
        .from('checklists')
        .select('id, tipo, data_conclusao')
        .eq('id', ocorrenciaBase.checklist_id)
        .maybeSingle()
    : { data: null }

  const { data: auditoria } = ocorrenciaBase.auditoria_id
    ? await supabase
        .from('auditorias')
        .select('id, data_conclusao')
        .eq('id', ocorrenciaBase.auditoria_id)
        .maybeSingle()
    : { data: null }

  const ocorrencia = {
    ...ocorrenciaBase,
    veiculos: veiculo,
    checklist_items: item,
    checklists: checklist,
    auditorias: auditoria,
  }

  const { data: historico, error: errHistorico } = await supabase
    .from('ocorrencia_historico')
    .select('id, status_anterior, status_novo, observacao, criado_em, feito_por')
    .eq('ocorrencia_id', id)
    .order('criado_em', { ascending: true })

  if (errHistorico) throw new Error(errHistorico.message)

  const userIds = [
    ...new Set(
      (historico ?? [])
        .map((h) => h.feito_por)
        .filter(Boolean)
    ),
  ]

  let perfisMap = new Map<string, string>()

  if (userIds.length > 0) {
    const { data: perfis } = await supabase
      .from('usuarios_perfis')
      .select('user_id, nome')
      .in('user_id', userIds)

    perfisMap = new Map((perfis ?? []).map((p) => [p.user_id, p.nome]))
  }

  const fotos = await buscarFotosDaOcorrencia(supabase, ocorrenciaBase)

  return {
    ocorrencia,
    historico: (historico ?? []).map((h) => ({
      ...h,
      nome_usuario: h.feito_por
        ? perfisMap.get(h.feito_por) ?? 'Usuário'
        : 'Sistema',
    })),
    fotos,
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
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
      email_status: 'nao_enviado',
      bloqueante: true,
      aberta_por: user.id,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await encaminharOcorrenciaParaManutencaoSeguro(data.id, {
    falharAoErro: false,
  })

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
  const {
    data: { user },
  } = await supabase.auth.getUser()

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

  if (observacao?.trim()) {
    await supabase.from('ocorrencia_historico').insert({
      ocorrencia_id: id,
      status_anterior: atual.status as never,
      status_novo: novoStatus as never,
      observacao: observacao.trim(),
      feito_por: user.id,
    })
  }

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

  const { error } = await supabase
    .from('ocorrencias')
    .update(payload)
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath(`/ocorrencias/${id}`)
  revalidatePath('/ocorrencias')
}

// ============================================================
// UPLOAD DE FOTO DE SOLUÇÃO
// ============================================================

export async function registrarFotoSolucao(
  ocorrenciaId: string,
  foto: {
    storage_path: string
    nome_original: string
    tamanho_bytes: number
    mime_type: string
  }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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

export async function reenviarEmailManutencao(ocorrenciaId: string) {
  const resultado = await encaminharOcorrenciaParaManutencaoSeguro(
    ocorrenciaId,
    { falharAoErro: true }
  )

  revalidatePath(`/ocorrencias/${ocorrenciaId}`)
  revalidatePath('/ocorrencias')
  revalidatePath('/veiculos')

  return resultado
}

export async function registrarEntradaOficina(
  ocorrenciaId: string,
  observacao?: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Não autenticado.')

  const agora = new Date().toISOString()

  const { data: ocorrencia, error } = await supabase
    .from('ocorrencias')
    .select('id, status, veiculo_id')
    .eq('id', ocorrenciaId)
    .single()

  if (error || !ocorrencia) {
    throw new Error(error?.message ?? 'Ocorrência não encontrada.')
  }

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
    .update({
      status_operacional: 'em_oficina',
      bloqueado_checklist: true,
    })
    .eq('id', ocorrencia.veiculo_id)

  revalidatePath(`/ocorrencias/${ocorrenciaId}`)
  revalidatePath('/ocorrencias')
  revalidatePath('/veiculos')
}

export async function validarLiberarOcorrencia(
  ocorrenciaId: string,
  observacao?: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Não autenticado.')

  const agora = new Date().toISOString()

  const { data: ocorrencia, error } = await supabase
    .from('ocorrencias')
    .select('id, status, veiculo_id, item_id, criado_em, data_entrada_oficina, data_saida_oficina')
    .eq('id', ocorrenciaId)
    .single()

  if (error || !ocorrencia) {
    throw new Error(error?.message ?? 'Ocorrência não encontrada.')
  }

  const diasOficina = calcularDiasEntre(
    ocorrencia.data_entrada_oficina,
    ocorrencia.data_saida_oficina ?? agora
  )

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

export async function liberarChecklistEmergencial(
  ocorrenciaId: string,
  observacao: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Não autenticado.')

  if (!observacao.trim()) {
    throw new Error('Informe o motivo da liberação emergencial.')
  }

  const { data: ocorrencia, error } = await supabase
    .from('ocorrencias')
    .select('id, status, veiculo_id')
    .eq('id', ocorrenciaId)
    .single()

  if (error || !ocorrencia) {
    throw new Error(error?.message ?? 'Ocorrência não encontrada.')
  }

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
