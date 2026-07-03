import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

const STATUS_BLOQUEIO = {
  veiculo: 'encaminhado_manutencao',
  tratativa: 'encaminhado_manutencao',
} as const

type EmailSendResult = {
  emailStatus: 'enviado' | 'pendente_configuracao' | 'erro'
  provider: 'smtp' | 'resend' | null
  providerId: string | null
  erro: string | null
}

function appUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

function destinatariosManutencao() {
  return (process.env.MANUTENCAO_EMAILS ?? '')
    .split(/[;,]/)
    .map((e) => e.trim())
    .filter(Boolean)
}

function formatarDataHora(valor?: string | null) {
  if (!valor) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(valor))
}

function escapeHtml(valor: unknown) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function parseBoolean(valor?: string | null) {
  return ['true', '1', 'yes', 'sim', 's'].includes(String(valor ?? '').trim().toLowerCase())
}

function smtpConfigurado() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM)
}

function resendConfigurado() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

async function enviarEmailSmtp({
  to,
  subject,
  html,
}: {
  to: string[]
  subject: string
  html: string
}): Promise<EmailSendResult> {
  const nodemailer = await import('nodemailer')
  const port = Number(process.env.SMTP_PORT ?? '465')

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? parseBoolean(process.env.SMTP_SECURE) : port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  })

  return {
    emailStatus: 'enviado',
    provider: 'smtp',
    providerId: info.messageId ?? null,
    erro: null,
  }
}

async function enviarEmailResend({
  to,
  subject,
  html,
}: {
  to: string[]
  subject: string
  html: string
}): Promise<EmailSendResult> {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    }),
  })

  const json = await resp.json().catch(() => ({}))
  if (!resp.ok) throw new Error(json?.message ?? `Erro HTTP ${resp.status}`)

  return {
    emailStatus: 'enviado',
    provider: 'resend',
    providerId: json?.id ?? null,
    erro: null,
  }
}

async function enviarEmailManutencao({
  to,
  subject,
  html,
}: {
  to: string[]
  subject: string
  html: string
}): Promise<EmailSendResult> {
  if (!to.length || !process.env.EMAIL_FROM) {
    return {
      emailStatus: 'pendente_configuracao',
      provider: null,
      providerId: null,
      erro: 'Configure EMAIL_FROM e MANUTENCAO_EMAILS para envio real.',
    }
  }

  const providerPreferido = (process.env.EMAIL_PROVIDER ?? '').trim().toLowerCase()

  try {
    if ((providerPreferido === 'smtp' || !providerPreferido) && smtpConfigurado()) {
      return await enviarEmailSmtp({ to, subject, html })
    }

    if ((providerPreferido === 'resend' || !providerPreferido) && resendConfigurado()) {
      return await enviarEmailResend({ to, subject, html })
    }

    return {
      emailStatus: 'pendente_configuracao',
      provider: null,
      providerId: null,
      erro: 'Nenhum provedor de e-mail configurado. Configure SMTP ou Resend.',
    }
  } catch (err) {
    return {
      emailStatus: 'erro',
      provider: smtpConfigurado() ? 'smtp' : resendConfigurado() ? 'resend' : null,
      providerId: null,
      erro: err instanceof Error ? err.message : 'Erro desconhecido ao enviar e-mail.',
    }
  }
}

async function signedChecklistUrls(paths: string[]) {
  const supabase = createAdminClient()
  const urls: Array<{ path: string; url: string }> = []

  for (const path of paths) {
    const { data } = await supabase.storage
      .from('checklist-fotos')
      .createSignedUrl(path, 60 * 60 * 24 * 7)
    if (data?.signedUrl) urls.push({ path, url: data.signedUrl })
  }

  return urls
}

export async function encaminharOcorrenciaParaManutencao(ocorrenciaId: string) {
  const supabase = createAdminClient()

  const { data: ocorrencia, error } = await supabase
    .from('ocorrencias')
    .select(`
      id, numero, descricao, gravidade, status, status_tratativa, criado_em,
      veiculo_id, checklist_id, auditoria_id, item_id,
      veiculos(id, placa, codigo_frota, tipo, km_atual),
      checklist_items(id, nome, item_critico, checklist_categorias(nome)),
      checklists(id, tipo, km, data_conclusao, motoristas(nome, matricula)),
      auditorias(id, km, data_conclusao, motoristas(nome, matricula))
    `)
    .eq('id', ocorrenciaId)
    .single()

  if (error || !ocorrencia) {
    throw new Error(error?.message ?? 'Ocorrência não encontrada para envio à manutenção.')
  }

  const token = crypto.randomUUID().replaceAll('-', '')
  const expiraEm = new Date()
  expiraEm.setDate(expiraEm.getDate() + 30)

  await supabase.from('ocorrencia_acessos_manutencao').insert({
    ocorrencia_id: ocorrenciaId,
    token,
    expira_em: expiraEm.toISOString(),
    ativo: true,
  })

  const { data: fotos } = await supabase
    .from('checklist_fotos')
    .select('storage_path')
    .eq('ocorrencia_id', ocorrenciaId)
    .order('criado_em', { ascending: true })

  const signedUrls = await signedChecklistUrls((fotos ?? []).map((f) => f.storage_path))

  const veiculo = ocorrencia.veiculos as unknown as { placa: string; codigo_frota: string | null; tipo: string; km_atual: number | null } | null
  const item = ocorrencia.checklist_items as unknown as { nome: string; checklist_categorias: { nome: string } | null } | null
  const checklist = ocorrencia.checklists as unknown as { tipo: string; km: number | null; data_conclusao: string | null; motoristas: { nome: string; matricula: string } | null } | null
  const auditoria = ocorrencia.auditorias as unknown as { km: number | null; data_conclusao: string | null; motoristas: { nome: string; matricula: string } | null } | null
  const origem = checklist ?? auditoria
  const motorista = origem?.motoristas

  const linkOcorrencia = `${appUrl()}/ocorrencias/${ocorrenciaId}`
  const linkManutencao = `${appUrl()}/manutencao/ocorrencias/${token}`

  const assunto = `[OC-${ocorrencia.numero}] Não conformidade — Veículo ${veiculo?.placa ?? 'não informado'}`
  const corpoHtml = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.45">
      <h2 style="margin:0 0 12px">Não conformidade identificada na frota</h2>
      <p>Uma ocorrência foi aberta automaticamente a partir de um checklist/auditoria.</p>
      <table style="border-collapse:collapse;width:100%;max-width:720px">
        <tr><td style="padding:6px;border:1px solid #dbe4ef"><strong>Ocorrência</strong></td><td style="padding:6px;border:1px solid #dbe4ef">OC-${ocorrencia.numero}</td></tr>
        <tr><td style="padding:6px;border:1px solid #dbe4ef"><strong>Veículo</strong></td><td style="padding:6px;border:1px solid #dbe4ef">${escapeHtml(veiculo?.placa)}${veiculo?.codigo_frota ? ` — Frota ${escapeHtml(veiculo.codigo_frota)}` : ''}</td></tr>
        <tr><td style="padding:6px;border:1px solid #dbe4ef"><strong>Motorista</strong></td><td style="padding:6px;border:1px solid #dbe4ef">${escapeHtml(motorista?.nome ?? 'Não informado')}${motorista?.matricula ? ` — Mat. ${escapeHtml(motorista.matricula)}` : ''}</td></tr>
        <tr><td style="padding:6px;border:1px solid #dbe4ef"><strong>Data/hora</strong></td><td style="padding:6px;border:1px solid #dbe4ef">${formatarDataHora(origem?.data_conclusao ?? ocorrencia.criado_em)}</td></tr>
        <tr><td style="padding:6px;border:1px solid #dbe4ef"><strong>KM</strong></td><td style="padding:6px;border:1px solid #dbe4ef">${escapeHtml(origem?.km ?? veiculo?.km_atual ?? 'Não informado')}</td></tr>
        <tr><td style="padding:6px;border:1px solid #dbe4ef"><strong>Item não conforme</strong></td><td style="padding:6px;border:1px solid #dbe4ef">${escapeHtml(item?.nome)}${item?.checklist_categorias?.nome ? ` — ${escapeHtml(item.checklist_categorias.nome)}` : ''}</td></tr>
        <tr><td style="padding:6px;border:1px solid #dbe4ef"><strong>Descrição</strong></td><td style="padding:6px;border:1px solid #dbe4ef">${escapeHtml(ocorrencia.descricao)}</td></tr>
      </table>
      <p style="margin-top:18px">
        <a href="${linkManutencao}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:bold">Registrar devolutiva da manutenção</a>
      </p>
      <p><a href="${linkOcorrencia}">Abrir ocorrência no sistema</a></p>
      ${signedUrls.length ? `<h3>Fotos</h3><ul>${signedUrls.map((f, i) => `<li><a href="${f.url}">Foto ${i + 1}</a></li>`).join('')}</ul>` : '<p><em>Nenhuma foto vinculada à ocorrência.</em></p>'}
    </div>
  `

  const destinatarios = destinatariosManutencao()
  const envio = await enviarEmailManutencao({
    to: destinatarios,
    subject: assunto,
    html: corpoHtml,
  })

  await supabase.from('ocorrencia_email_logs').insert({
    ocorrencia_id: ocorrenciaId,
    destinatarios,
    assunto,
    corpo_html: corpoHtml,
    status: envio.emailStatus,
    provider: envio.provider,
    provider_id: envio.providerId,
    erro: envio.erro,
  })

  await supabase
    .from('ocorrencias')
    .update({
      status: 'aguardando_manutencao' as never,
      status_tratativa: STATUS_BLOQUEIO.tratativa,
      email_enviado_em: envio.emailStatus === 'enviado' ? new Date().toISOString() : null,
      email_destinatarios: destinatarios,
      email_status: envio.emailStatus,
      email_erro: envio.erro,
      protocolo_email: envio.providerId,
      data_encaminhado_manutencao: new Date().toISOString(),
    })
    .eq('id', ocorrenciaId)

  await supabase
    .from('veiculos')
    .update({
      status_operacional: STATUS_BLOQUEIO.veiculo,
      bloqueado_checklist: true,
      ocorrencia_bloqueante_id: ocorrenciaId,
      bloqueio_motivo: `Ocorrência OC-${ocorrencia.numero}: ${ocorrencia.descricao}`,
      data_bloqueio: new Date().toISOString(),
    })
    .eq('id', ocorrencia.veiculo_id)

  return {
    emailStatus: envio.emailStatus,
    destinatarios,
    providerId: envio.providerId,
    erro: envio.erro,
    linkManutencao,
  }
}
