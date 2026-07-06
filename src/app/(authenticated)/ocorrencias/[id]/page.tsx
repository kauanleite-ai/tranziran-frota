import { Header } from '@/components/layout/Header'
import { OcorrenciaDetalheCliente } from './OcorrenciaDetalheCliente'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

type Foto = {
  id: string
  storage_path: string
  nome_original: string
  criado_em: string
}

function normalizarRelacao<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) {
    return valor[0] ?? null
  }

  return valor ?? null
}

export default async function OcorrenciaDetalhePage({ params }: Props) {
  const { id } = await params
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
      veiculos:veiculo_id (
        id,
        placa,
        codigo_frota,
        tipo,
        fabricante,
        modelo
      ),
      checklist_items:item_id (
        id,
        nome,
        item_critico
      ),
      checklists:checklist_id (
        id,
        tipo,
        data_conclusao
      ),
      auditorias:auditoria_id (
        id,
        data_conclusao
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar detalhe da ocorrência:', error)
    notFound()
  }

  if (!ocorrenciaRaw) {
    notFound()
  }

  const ocorrencia = ocorrenciaRaw as any

  const veiculo = normalizarRelacao(ocorrencia.veiculos)
  const item = normalizarRelacao(ocorrencia.checklist_items)
  const checklist = normalizarRelacao(ocorrencia.checklists)
  const auditoria = normalizarRelacao(ocorrencia.auditorias)

  const { data: historicoRaw, error: historicoError } = await supabase
    .from('ocorrencia_historico')
    .select(`
      id,
      status_anterior,
      status_novo,
      observacao,
      criado_em,
      feito_por
    `)
    .eq('ocorrencia_id', id)
    .order('criado_em', { ascending: true })

  if (historicoError) {
    console.error('Erro ao buscar histórico da ocorrência:', historicoError)
  }

  const historico = (historicoRaw ?? []) as any[]

  const userIds = [
    ...new Set(
      historico
        .map((movimentacao) => movimentacao.feito_por)
        .filter(Boolean)
    ),
  ]

  let perfisMap = new Map<string, string>()

  if (userIds.length > 0) {
    const { data: perfisRaw } = await supabase
      .from('usuarios_perfis')
      .select('user_id, nome')
      .in('user_id', userIds)

    const perfis = (perfisRaw ?? []) as any[]

    perfisMap = new Map(
      perfis.map((perfil) => [perfil.user_id, perfil.nome])
    )
  }

  const fotosMap = new Map<string, Foto>()

  const { data: fotosDiretasRaw } = await supabase
    .from('checklist_fotos')
    .select('id, storage_path, nome_original, criado_em')
    .eq('ocorrencia_id', id)
    .order('criado_em', { ascending: true })

  const fotosDiretas = (fotosDiretasRaw ?? []) as Foto[]

  for (const foto of fotosDiretas) {
    fotosMap.set(foto.id, foto)
  }

  if (ocorrencia.checklist_id && ocorrencia.item_id) {
    const { data: respostasChecklistRaw } = await supabase
      .from('checklist_respostas')
      .select('id')
      .eq('checklist_id', ocorrencia.checklist_id)
      .eq('item_id', ocorrencia.item_id)

    const respostasChecklist = (respostasChecklistRaw ?? []) as any[]
    const respostaIds = respostasChecklist.map((resposta) => resposta.id)

    if (respostaIds.length > 0) {
      const { data: fotosOrigemRaw } = await supabase
        .from('checklist_fotos')
        .select('id, storage_path, nome_original, criado_em')
        .in('resposta_id', respostaIds)
        .order('criado_em', { ascending: true })

      const fotosOrigem = (fotosOrigemRaw ?? []) as Foto[]

      for (const foto of fotosOrigem) {
        fotosMap.set(foto.id, foto)
      }
    }
  }

  if (ocorrencia.auditoria_id && ocorrencia.item_id) {
    const { data: respostasAuditoriaRaw } = await supabase
      .from('auditoria_respostas')
      .select('id')
      .eq('auditoria_id', ocorrencia.auditoria_id)
      .eq('item_id', ocorrencia.item_id)

    const respostasAuditoria = (respostasAuditoriaRaw ?? []) as any[]
    const respostaIds = respostasAuditoria.map((resposta) => resposta.id)

    if (respostaIds.length > 0) {
      const { data: fotosOrigemRaw } = await supabase
        .from('checklist_fotos')
        .select('id, storage_path, nome_original, criado_em')
        .in('resposta_id', respostaIds)
        .order('criado_em', { ascending: true })

      const fotosOrigem = (fotosOrigemRaw ?? []) as Foto[]

      for (const foto of fotosOrigem) {
        fotosMap.set(foto.id, foto)
      }
    }
  }

  const dados = {
    ocorrencia: {
      ...ocorrencia,
      veiculos: veiculo,
      checklist_items: item
        ? {
            ...item,
            checklist_categorias: null,
          }
        : null,
      checklists: checklist,
      auditorias: auditoria,
    },
    historico: historico.map((movimentacao) => ({
      id: movimentacao.id,
      status_anterior: movimentacao.status_anterior,
      status_novo: movimentacao.status_novo,
      observacao: movimentacao.observacao,
      criado_em: movimentacao.criado_em,
      nome_usuario: movimentacao.feito_por
        ? perfisMap.get(movimentacao.feito_por) ?? 'Usuário'
        : 'Sistema',
    })),
    fotos: [...fotosMap.values()].sort(
      (a, b) =>
        new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
    ),
  }

  const placa = veiculo?.placa

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title={`Ocorrência #${ocorrencia.numero}`}
        subtitle={placa ? `Veículo ${placa}` : 'Detalhes e tratamento'}
      />

      <OcorrenciaDetalheCliente dados={dados as never} />
    </div>
  )
}