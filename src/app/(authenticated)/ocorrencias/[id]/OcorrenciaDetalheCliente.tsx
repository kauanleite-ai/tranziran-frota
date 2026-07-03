'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, AlertTriangle, CheckCircle2, Clock, User,
  Camera, MessageSquare, ChevronRight, ImageIcon, Loader2
} from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { FotoUpload } from '@/components/checklists/FotoUpload'
import { useToast } from '@/components/ui/Toast'
import {
  moverStatusOcorrencia,
  registrarFotoSolucao,
  reenviarEmailManutencao,
  registrarEntradaOficina,
  validarLiberarOcorrencia,
  liberarChecklistEmergencial,
} from '@/lib/actions/ocorrencias'
import { obterUrlFotoAsync } from '@/lib/storage'
import type { FotoUploadResult } from '@/lib/storage'
import {
  STATUS_OCORRENCIA_LABEL,
  STATUS_TRATATIVA_LABEL,
  GRAVIDADE_LABEL,
  RESPONSAVEL_OCORRENCIA_LABEL,
  TIPO_VEICULO_LABEL,
} from '@/lib/constants'
import { formatarData, formatarDataHora } from '@/utils'

type HistoricoItem = {
  id: string; status_anterior: string | null; status_novo: string
  observacao: string | null; criado_em: string; nome_usuario: string
}

type Foto = { id: string; storage_path: string; nome_original: string; criado_em: string }

type OcorrenciaInfo = {
  id: string; numero: number; descricao: string; gravidade: string
  responsavel: string; prazo: string | null; status: string; status_tratativa: string
  bloqueante: boolean; email_status: string; email_erro: string | null; email_enviado_em: string | null
  data_encaminhado_manutencao: string | null; data_devolutiva_manutencao: string | null
  data_solicitado_oficina: string | null; data_entrada_oficina: string | null; data_saida_oficina: string | null
  data_validacao_frota: string | null; dias_em_oficina: number | null; dias_pendencia_total: number | null
  devolutiva_manutencao: string | null
  criado_em: string; data_resolucao: string | null
  veiculos: { id: string; placa: string; codigo_frota: string | null; tipo: string; fabricante: string | null; modelo: string | null } | null
  checklist_items: { id: string; nome: string; item_critico: boolean; checklist_categorias: { nome: string } | null } | null
  checklists: { id: string; tipo: string; data_conclusao: string | null } | null
  auditorias: { id: string; data_conclusao: string | null } | null
}

interface Props {
  dados: {
    ocorrencia: OcorrenciaInfo
    historico: HistoricoItem[]
    fotos: Foto[]
  }
}

// Status disponíveis para transição
const TRANSICOES: Record<string, { value: string; label: string }[]> = {
  aberta: [
    { value: 'em_analise', label: 'Colocar em análise' },
    { value: 'aguardando_manutencao', label: 'Aguardando manutenção' },
    { value: 'cancelada', label: 'Cancelar' },
  ],
  em_analise: [
    { value: 'aguardando_manutencao', label: 'Aguardando manutenção' },
    { value: 'reprovada', label: 'Reprovar solução' },
    { value: 'cancelada', label: 'Cancelar' },
  ],
  aguardando_manutencao: [
    { value: 'em_analise', label: 'Voltar para análise' },
    { value: 'cancelada', label: 'Cancelar' },
  ],
}

const gravidadeBadge: Record<string, 'red' | 'orange' | 'yellow' | 'gray'> = {
  critica: 'red', alta: 'orange', media: 'yellow', baixa: 'gray',
}

const statusBadge: Record<string, 'red' | 'orange' | 'yellow' | 'green' | 'gray'> = {
  aberta: 'red', em_analise: 'orange', aguardando_manutencao: 'yellow',
  resolvida: 'green', reprovada: 'gray', cancelada: 'gray',
}

const statusIcone: Record<string, typeof CheckCircle2> = {
  aberta: AlertTriangle, em_analise: Clock, aguardando_manutencao: Clock,
  resolvida: CheckCircle2, reprovada: AlertTriangle, cancelada: AlertTriangle,
}

export function OcorrenciaDetalheCliente({ dados }: Props) {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const { ocorrencia, historico, fotos } = dados

  // Modal de movimentação
  const [modalMover, setModalMover] = useState(false)
  const [novoStatus, setNovoStatus] = useState('')
  const [observacaoMover, setObservacaoMover] = useState('')
  const [fotosSolucao, setFotosSolucao] = useState<FotoUploadResult[]>([])
  const [loadingMover, setLoadingMover] = useState(false)

  // URLs das fotos
  const [urlsFotos, setUrlsFotos] = useState<Map<string, string>>(new Map())
  useEffect(() => {
    let ativo = true
    async function carregar() {
      const novasUrls = new Map<string, string>()
      for (const foto of fotos) {
        const bucket = foto.storage_path.includes('ocorrencia') ? 'ocorrencia-fotos' : 'checklist-fotos'
        const url = await obterUrlFotoAsync(bucket, foto.storage_path)
        if (url) novasUrls.set(foto.id, url)
      }
      if (ativo) setUrlsFotos(novasUrls)
    }
    if (fotos.length > 0) carregar()
    return () => { ativo = false }
  }, [fotos])

  const transicoesDisponiveis = TRANSICOES[ocorrencia.status] ?? []
  const encerrada = ['resolvida', 'reprovada', 'cancelada'].includes(ocorrencia.status)

  async function handleMoverStatus() {
    if (!novoStatus) return toastError('Selecione o novo status.')
    if (novoStatus === 'resolvida' && !observacaoMover.trim()) {
      return toastError('Descreva como o problema foi resolvido.')
    }
    setLoadingMover(true)
    try {
      // Salva fotos de solução primeiro
      for (const foto of fotosSolucao) {
        await registrarFotoSolucao(ocorrencia.id, foto)
      }
      await moverStatusOcorrencia(ocorrencia.id, novoStatus, observacaoMover)
      success(`Status atualizado para "${STATUS_OCORRENCIA_LABEL[novoStatus as keyof typeof STATUS_OCORRENCIA_LABEL]}".`)
      setModalMover(false)
      setNovoStatus('')
      setObservacaoMover('')
      setFotosSolucao([])
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao atualizar status.')
    } finally {
      setLoadingMover(false)
    }
  }

  const StatusIcon = statusIcone[ocorrencia.status] ?? AlertTriangle

  async function handleReenviarEmail() {
    if (!confirm('Reenviar/gerar encaminhamento para manutenção?')) return
    setLoadingMover(true)
    try {
      const res = await reenviarEmailManutencao(ocorrencia.id)
      if (res.emailStatus === 'enviado') success('E-mail enviado para manutenção.')
      else if (res.emailStatus === 'pendente_configuracao') success('Encaminhamento registrado. Configure SMTP ou Resend, EMAIL_FROM e MANUTENCAO_EMAILS para envio real.')
      else toastError(res.erro ?? 'Não foi possível enviar o e-mail, mas o encaminhamento foi registrado.')
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao encaminhar ocorrência.')
    } finally {
      setLoadingMover(false)
    }
  }

  async function handleEntradaOficina() {
    const obs = prompt('Observação da entrada em oficina:', 'Veículo encaminhado/recebido na oficina para tratativa.')
    if (obs === null) return
    setLoadingMover(true)
    try {
      await registrarEntradaOficina(ocorrencia.id, obs)
      success('Entrada em oficina registrada.')
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao registrar entrada em oficina.')
    } finally {
      setLoadingMover(false)
    }
  }

  async function handleValidarLiberar() {
    const obs = prompt('Observação da validação/liberação:', 'Problema conferido pela Frota e veículo liberado.')
    if (obs === null) return
    setLoadingMover(true)
    try {
      await validarLiberarOcorrencia(ocorrencia.id, obs)
      success('Ocorrência validada e veículo liberado.')
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao validar/liberar ocorrência.')
    } finally {
      setLoadingMover(false)
    }
  }

  async function handleLiberacaoEmergencial() {
    const obs = prompt('Motivo da liberação emergencial do checklist:')
    if (!obs) return
    setLoadingMover(true)
    try {
      await liberarChecklistEmergencial(ocorrencia.id, obs)
      success('Checklist liberado emergencialmente para este veículo.')
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao liberar checklist.')
    } finally {
      setLoadingMover(false)
    }
  }

  return (
    <div className="flex-1 p-6 space-y-5">
      <button
        onClick={() => router.push('/ocorrencias')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para ocorrências
      </button>

      {/* Cabeçalho */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                ocorrencia.gravidade === 'critica' || ocorrencia.gravidade === 'alta'
                  ? 'bg-red-100' : ocorrencia.gravidade === 'media' ? 'bg-yellow-100' : 'bg-slate-100'
              }`}>
                <AlertTriangle className={`w-6 h-6 ${
                  ocorrencia.gravidade === 'critica' || ocorrencia.gravidade === 'alta'
                    ? 'text-red-600' : ocorrencia.gravidade === 'media' ? 'text-yellow-600' : 'text-slate-500'
                }`} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400 font-mono">#{ocorrencia.numero}</span>
                  <Badge variant={gravidadeBadge[ocorrencia.gravidade] ?? 'gray'}>
                    {GRAVIDADE_LABEL[ocorrencia.gravidade as keyof typeof GRAVIDADE_LABEL]}
                  </Badge>
                  <Badge variant={statusBadge[ocorrencia.status] ?? 'gray'}>
                    <StatusIcon className="w-3 h-3 mr-0.5" />
                    {STATUS_OCORRENCIA_LABEL[ocorrencia.status as keyof typeof STATUS_OCORRENCIA_LABEL]}
                  </Badge>
                </div>
                <p className="text-slate-900 font-medium mt-2">{ocorrencia.descricao}</p>
                <p className="text-sm text-slate-500 mt-1">
                  Item: <span className="font-medium text-slate-700">{ocorrencia.checklist_items?.nome ?? '—'}</span>
                  {ocorrencia.checklist_items?.checklist_categorias?.nome && (
                    <span className="text-slate-400"> · {ocorrencia.checklist_items.checklist_categorias.nome}</span>
                  )}
                  {ocorrencia.checklist_items?.item_critico && (
                    <Badge variant="red" className="ml-2">Crítico</Badge>
                  )}
                </p>
              </div>
            </div>
            {!encerrada && transicoesDisponiveis.length > 0 && (
              <Button onClick={() => setModalMover(true)}>
                <ChevronRight className="w-4 h-4" />
                Atualizar status
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-100">
            {[
              { label: 'Veículo', value: ocorrencia.veiculos?.placa ?? '—' },
              { label: 'Tipo', value: TIPO_VEICULO_LABEL[ocorrencia.veiculos?.tipo as keyof typeof TIPO_VEICULO_LABEL] ?? '—' },
              { label: 'Responsável', value: RESPONSAVEL_OCORRENCIA_LABEL[ocorrencia.responsavel as keyof typeof RESPONSAVEL_OCORRENCIA_LABEL] ?? '—' },
              { label: 'Prazo', value: ocorrencia.prazo ? formatarData(ocorrencia.prazo) : '—' },
              { label: 'Aberta em', value: formatarData(ocorrencia.criado_em) },
              { label: 'Origem', value: ocorrencia.checklists ? 'Checklist' : ocorrencia.auditorias ? 'Auditoria' : '—' },
              ...(ocorrencia.data_resolucao ? [{ label: 'Resolvida em', value: formatarData(ocorrencia.data_resolucao) }] : []),
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-slate-400 font-medium">{item.label}</p>
                <p className="text-sm text-slate-800 font-medium mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Status operacional e manutenção" description="Controle da tratativa e bloqueio de novos checklists" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
              <p className="text-xs text-blue-500 font-bold uppercase">Tratativa</p>
              <p className="text-sm font-bold text-blue-950 mt-1">
                {STATUS_TRATATIVA_LABEL[ocorrencia.status_tratativa as keyof typeof STATUS_TRATATIVA_LABEL] ?? ocorrencia.status_tratativa}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <p className="text-xs text-slate-400 font-bold uppercase">E-mail manutenção</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{ocorrencia.email_status || 'não enviado'}</p>
              <p className="text-xs text-slate-500">{ocorrencia.email_enviado_em ? formatarDataHora(ocorrencia.email_enviado_em) : 'Sem envio confirmado'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <p className="text-xs text-slate-400 font-bold uppercase">Tempo em oficina</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{ocorrencia.dias_em_oficina != null ? `${ocorrencia.dias_em_oficina} dia(s)` : '—'}</p>
              <p className="text-xs text-slate-500">Entrada: {ocorrencia.data_entrada_oficina ? formatarDataHora(ocorrencia.data_entrada_oficina) : '—'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <p className="text-xs text-slate-400 font-bold uppercase">Pendência total</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{ocorrencia.dias_pendencia_total != null ? `${ocorrencia.dias_pendencia_total} dia(s)` : 'em aberto'}</p>
              <p className="text-xs text-slate-500">Bloqueante: {ocorrencia.bloqueante ? 'Sim' : 'Não'}</p>
            </div>
          </div>
          {ocorrencia.email_erro && (
            <p className="mt-3 rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-700">Erro de e-mail: {ocorrencia.email_erro}</p>
          )}
          {ocorrencia.devolutiva_manutencao && (
            <p className="mt-3 rounded-lg bg-slate-50 border border-slate-100 p-3 text-sm text-slate-700">
              <strong>Última devolutiva da manutenção:</strong> {ocorrencia.devolutiva_manutencao}
            </p>
          )}
          {!encerrada && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={handleReenviarEmail} disabled={loadingMover}>Encaminhar/Reenviar e-mail</Button>
              <Button variant="outline" onClick={handleEntradaOficina} disabled={loadingMover}>Registrar entrada na oficina</Button>
              <Button onClick={handleValidarLiberar} disabled={loadingMover}>Validar e liberar veículo</Button>
              <Button variant="danger" onClick={handleLiberacaoEmergencial} disabled={loadingMover}>Liberação emergencial</Button>
            </div>
          )}
        </Card>

        {/* Fotos */}
        <Card>
          <CardHeader
            title="Evidências fotográficas"
            description={`${fotos.length} foto(s)`}
          />
          {fotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Camera className="w-8 h-8 text-slate-200 mb-2" />
              <p className="text-xs text-slate-400">Sem fotos registradas</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {fotos.map((foto) => {
                const url = urlsFotos.get(foto.id)
                return (
                  <a
                    key={foto.id}
                    href={url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={foto.nome_original}
                    className="aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center"
                  >
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={foto.nome_original} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-300" />
                    )}
                  </a>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Linha do tempo do histórico */}
      <Card>
        <CardHeader
          title="Histórico de movimentação"
          description="Todas as alterações de status desta ocorrência"
        />
        {historico.length === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
            <MessageSquare className="w-5 h-5 text-slate-300" />
            <p className="text-sm text-slate-400">Nenhuma movimentação registrada ainda.</p>
          </div>
        ) : (
          <div className="relative pl-4">
            {/* Linha vertical */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-200" />

            <div className="space-y-4">
              {historico.map((h, idx) => (
                <div key={h.id} className="flex items-start gap-4 relative">
                  {/* Marcador */}
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 -ml-3 z-10 ${
                    idx === historico.length - 1
                      ? 'bg-blue-500 border-blue-500'
                      : 'bg-white border-slate-300'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      idx === historico.length - 1 ? 'bg-white' : 'bg-slate-300'
                    }`} />
                  </div>

                  <div className="flex-1 pb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {h.status_anterior && (
                        <>
                          <Badge variant={statusBadge[h.status_anterior] ?? 'gray'}>
                            {STATUS_OCORRENCIA_LABEL[h.status_anterior as keyof typeof STATUS_OCORRENCIA_LABEL] ?? h.status_anterior}
                          </Badge>
                          <ChevronRight className="w-3 h-3 text-slate-300" />
                        </>
                      )}
                      <Badge variant={statusBadge[h.status_novo] ?? 'gray'}>
                        {STATUS_OCORRENCIA_LABEL[h.status_novo as keyof typeof STATUS_OCORRENCIA_LABEL] ?? h.status_novo}
                      </Badge>
                    </div>
                    {h.observacao && (
                      <p className="text-sm text-slate-600 mt-1.5 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                        {h.observacao}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                      <User className="w-3 h-3" />
                      <span>{h.nome_usuario}</span>
                      <span>·</span>
                      <span>{formatarDataHora(h.criado_em)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Modal de movimentação */}
      <Modal
        open={modalMover}
        onClose={() => setModalMover(false)}
        title="Atualizar status da ocorrência"
        description={`Ocorrência #${ocorrencia.numero} — ${ocorrencia.checklist_items?.nome ?? ''}`}
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Novo status"
            value={novoStatus}
            onChange={(e) => setNovoStatus(e.target.value)}
            options={[
              { value: '', label: 'Selecione o novo status...' },
              ...transicoesDisponiveis,
            ]}
            required
          />

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Observação
              {novoStatus === 'resolvida' && (
                <span className="text-red-500 ml-0.5">*</span>
              )}
            </label>
            <textarea
              value={observacaoMover}
              onChange={(e) => setObservacaoMover(e.target.value)}
              placeholder={
                novoStatus === 'resolvida'
                  ? 'Descreva como o problema foi resolvido (obrigatório)'
                  : 'Observação sobre esta movimentação (opcional)'
              }
              rows={3}
              className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {(novoStatus === 'resolvida' || novoStatus === 'em_analise') && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">
                Foto da solução {novoStatus === 'resolvida' && '(recomendado)'}
              </p>
              <FotoUpload
                bucket="ocorrencia-fotos"
                pasta={`${ocorrencia.id}/solucao`}
                fotos={fotosSolucao}
                onChange={setFotosSolucao}
                maxFotos={3}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setModalMover(false)}>Cancelar</Button>
            <Button
              onClick={handleMoverStatus}
              loading={loadingMover}
              disabled={!novoStatus}
              variant={novoStatus === 'resolvida' ? 'primary' : novoStatus === 'cancelada' ? 'danger' : 'primary'}
            >
              {loadingMover ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
              ) : (
                <>
                  {novoStatus === 'resolvida' && <CheckCircle2 className="w-4 h-4" />}
                  Confirmar
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
