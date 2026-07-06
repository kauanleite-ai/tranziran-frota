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

export default async function OcorrenciaDetalhePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: ocorrencia, error } = await supabase
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

  if (!ocorrencia) {
    notFound()
  }

  const { data: historico, error: historicoError } = await supabase
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

  const userIds = [
    ...new Set(
      (historico ?? [])
        .map((item) => item.feito_por)
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

  const fotosMap = new Map<string, Foto>()

  const { data: fotosDiretas } = await supabase
    .from('checklist_fotos')
    .select('id, storage_path, nome_original, criado_em')
    .eq('ocorrencia_id', id)
    .order('criado_em', { ascending: true })

  for (const foto of fotosDiretas ?? []) {
    fotosMap.set(foto.id, foto)
  }

  const origem = ocorrencia as unknown as {
    checklist_id: string | null
    auditoria_id: string | null
    item_id: string | null
  }

  if (origem.checklist_id && origem.item_id) {
    const { data: respostasChecklist } = await supabase
      .from('checklist_respostas')
      .select('id')
      .eq('checklist_id', origem.checklist_id)
      .eq('item_id', origem.item_id)

    const respostaIds = (respostasChecklist ?? []).map((r) => r.id)

    if (respostaIds.length > 0) {
      const { data: fotosOrigem } = await supabase
        .from('checklist_fotos')
        .select('id, storage_path, nome_original, criado_em')
        .in('resposta_id', respostaIds)
        .order('criado_em', { ascending: true })

      for (const foto of fotosOrigem ?? []) {
        fotosMap.set(foto.id, foto)
      }
    }
  }

  if (origem.auditoria_id && origem.item_id) {
    const { data: respostasAuditoria } = await supabase
      .from('auditoria_respostas')
      .select('id')
      .eq('auditoria_id', origem.auditoria_id)
      .eq('item_id', origem.item_id)

    const respostaIds = (respostasAuditoria ?? []).map((r) => r.id)

    if (respostaIds.length > 0) {
      const { data: fotosOrigem } = await supabase
        .from('checklist_fotos')
        .select('id, storage_path, nome_original, criado_em')
        .in('resposta_id', respostaIds)
        .order('criado_em', { ascending: true })

      for (const foto of fotosOrigem ?? []) {
        fotosMap.set(foto.id, foto)
      }
    }
  }

  const dados = {
    ocorrencia: {
      ...ocorrencia,
      checklist_items: ocorrencia.checklist_items
        ? {
            ...ocorrencia.checklist_items,
            checklist_categorias: null,
          }
        : null,
    },
    historico: (historico ?? []).map((item) => ({
      id: item.id,
      status_anterior: item.status_anterior,
      status_novo: item.status_novo,
      observacao: item.observacao,
      criado_em: item.criado_em,
      nome_usuario: item.feito_por
        ? perfisMap.get(item.feito_por) ?? 'Usuário'
        : 'Sistema',
    })),
    fotos: [...fotosMap.values()].sort(
      (a, b) =>
        new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
    ),
  }

  const placa = ocorrencia.veiculos?.placa

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