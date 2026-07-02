'use client'

import { Check, RefreshCw, Camera, AlertTriangle } from 'lucide-react'
import { StatusSelector, type StatusResposta } from '@/components/checklists/StatusSelector'
import { FotoUpload } from '@/components/checklists/FotoUpload'
import { Badge } from '@/components/ui/Badge'
import { formatarData } from '@/utils'
import type { FotoUploadResult } from '@/lib/storage'

type EstadoAnterior = {
  resposta: string
  observacao: string | null
  ultima_foto_path: string | null
  data_atualizacao: string
}

export type RespostaAuditoriaLocal = {
  continua_igual: boolean | null   // null = ainda não respondido
  resposta_nova: StatusResposta | null
  observacao: string
  fotos: FotoUploadResult[]
}

interface ItemAuditoriaLinhaProps {
  item: {
    id: string
    nome: string
    descricao: string | null
    exige_foto: boolean
    exige_obs_se_nao_ok: boolean
    item_critico: boolean
  }
  estadoAnterior: EstadoAnterior | null
  valor: RespostaAuditoriaLocal
  onChange: (valor: RespostaAuditoriaLocal) => void
  pastaStorage: string
}

const RESPOSTA_LABEL: Record<string, string> = {
  ok: 'OK',
  nao_tem: 'Não tem',
  nao_ok: 'Não está OK',
  nao_aplica: 'N/A',
}

const RESPOSTA_COR: Record<string, string> = {
  ok: 'bg-green-50 text-green-700 border-green-200',
  nao_tem: 'bg-slate-50 text-slate-600 border-slate-200',
  nao_ok: 'bg-red-50 text-red-700 border-red-200',
  nao_aplica: 'bg-slate-50 text-slate-400 border-slate-100',
}

export function ItemAuditoriaLinha({
  item, estadoAnterior, valor, onChange, pastaStorage
}: ItemAuditoriaLinhaProps) {
  const precisaObs = item.exige_obs_se_nao_ok && valor.resposta_nova === 'nao_ok'
  const obsFaltando = precisaObs && !valor.observacao.trim()
  const naoPendente = valor.continua_igual !== null

  function marcarContinuaIgual() {
    onChange({
      continua_igual: true,
      resposta_nova: null,
      observacao: '',
      fotos: [],
    })
  }

  function marcarMudou() {
    onChange({
      continua_igual: false,
      resposta_nova: null,
      observacao: '',
      fotos: [],
    })
  }

  // Cor de fundo da linha baseada no estado
  const bgLinha = valor.continua_igual === true
    ? 'bg-green-50/40'
    : valor.continua_igual === false
    ? 'bg-orange-50/40'
    : 'bg-white hover:bg-slate-50/60'

  return (
    <div className={`transition-colors border-b border-slate-100 last:border-b-0 ${bgLinha}`}>
      {/* Linha principal */}
      <div className="flex items-start gap-3 p-4">
        {/* Indicador de estado */}
        <div className="mt-0.5 shrink-0">
          {valor.continua_igual === true ? (
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-green-600" />
            </div>
          ) : valor.continua_igual === false ? (
            <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
              <RefreshCw className="w-3.5 h-3.5 text-orange-600" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-slate-200" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Nome e badges */}
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-medium text-slate-800">{item.nome}</p>
                {item.item_critico && (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                )}
              </div>
              {item.descricao && (
                <p className="text-xs text-slate-400 mt-0.5">{item.descricao}</p>
              )}
            </div>
            {item.exige_foto && (
              <Badge variant="blue">
                <Camera className="w-3 h-3 mr-0.5" />
                Foto
              </Badge>
            )}
          </div>

          {/* Estado anterior */}
          {estadoAnterior && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400">Último estado:</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                RESPOSTA_COR[estadoAnterior.resposta] ?? 'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
                {RESPOSTA_LABEL[estadoAnterior.resposta] ?? estadoAnterior.resposta}
              </span>
              {estadoAnterior.observacao && (
                <span className="text-xs text-slate-400 italic truncate max-w-48">
                  &ldquo;{estadoAnterior.observacao}&rdquo;
                </span>
              )}
              <span className="text-xs text-slate-300">
                · {formatarData(estadoAnterior.data_atualizacao)}
              </span>
            </div>
          )}

          {!estadoAnterior && (
            <p className="text-xs text-orange-500">
              Estado anterior não encontrado — responda como se fosse primeira vez.
            </p>
          )}

          {/* Botões de ação — só aparecem se ainda não respondido */}
          {!naoPendente && (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={marcarContinuaIgual}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Continua igual
              </button>
              <button
                type="button"
                onClick={marcarMudou}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 text-xs font-medium hover:bg-orange-100 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Mudou
              </button>
            </div>
          )}

          {/* Resumo do que foi selecionado — "continua igual" */}
          {valor.continua_igual === true && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-green-600 font-medium">✓ Confirmado como igual</span>
              {item.exige_foto && valor.fotos.length === 0 && (
                <span className="text-xs text-orange-500">— foto de confirmação pendente</span>
              )}
              <button
                type="button"
                onClick={() => onChange({ ...valor, continua_igual: null })}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Alterar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Painel expandido — quando "Mudou" */}
      {valor.continua_igual === false && (
        <div className="px-4 pb-4 pl-13 space-y-3 ml-9">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Informe o novo estado
          </p>

          <StatusSelector
            value={valor.resposta_nova}
            onChange={(resposta_nova) => onChange({ ...valor, resposta_nova })}
          />

          {valor.resposta_nova && (
            <>
              <FotoUpload
                bucket="auditoria-fotos"
                pasta={pastaStorage}
                fotos={valor.fotos}
                onChange={(fotos) => onChange({ ...valor, fotos })}
                obrigatorio={item.exige_foto || valor.resposta_nova === 'nao_ok'}
              />

              {(precisaObs || valor.resposta_nova === 'nao_ok') && (
                <textarea
                  value={valor.observacao}
                  onChange={(e) => onChange({ ...valor, observacao: e.target.value })}
                  placeholder={
                    precisaObs
                      ? 'Descreva o problema encontrado (obrigatório)'
                      : 'Observação sobre a alteração (opcional)'
                  }
                  rows={2}
                  className={`w-full text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    obsFaltando ? 'border-orange-300 bg-orange-50' : 'border-slate-200'
                  }`}
                />
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => onChange({ ...valor, continua_igual: null, resposta_nova: null })}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Cancelar alteração
          </button>
        </div>
      )}

      {/* Foto de confirmação — quando "continua igual" mas o item exige foto */}
      {valor.continua_igual === true && item.exige_foto && (
        <div className="px-4 pb-4 ml-9">
          <p className="text-xs font-medium text-slate-500 mb-2">
            Foto de confirmação (obrigatória para este item)
          </p>
          <FotoUpload
            bucket="auditoria-fotos"
            pasta={pastaStorage}
            fotos={valor.fotos}
            onChange={(fotos) => onChange({ ...valor, fotos })}
            obrigatorio
            maxFotos={1}
          />
        </div>
      )}
    </div>
  )
}
