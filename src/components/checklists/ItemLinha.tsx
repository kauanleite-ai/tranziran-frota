'use client'

import { AlertTriangle } from 'lucide-react'
import { StatusSelector, type StatusResposta } from './StatusSelector'
import { FotoUpload } from './FotoUpload'
import type { FotoUploadResult } from '@/lib/storage'

export type RespostaEmEdicao = {
  resposta: StatusResposta | null
  observacao: string
  fotos: FotoUploadResult[]
}

interface ItemLinhaProps {
  item: {
    id: string
    nome: string
    descricao: string | null
    exige_foto: boolean
    exige_obs_se_nao_ok: boolean
    item_critico: boolean
  }
  valor: RespostaEmEdicao
  onChange: (valor: RespostaEmEdicao) => void
  pastaStorage: string
}

export function ItemLinha({ item, valor, onChange, pastaStorage }: ItemLinhaProps) {
  const precisaObs = item.exige_obs_se_nao_ok && valor.resposta === 'nao_ok'
  const obsFaltando = precisaObs && !valor.observacao.trim()
  const fotoFaltando = item.exige_foto && valor.fotos.length === 0 && valor.resposta !== null

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-slate-800">{item.nome}</p>
            {item.item_critico && (
              <span title="Item crítico">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              </span>
            )}
          </div>
          {item.descricao && (
            <p className="text-xs text-slate-400 mt-0.5">{item.descricao}</p>
          )}
        </div>
        <StatusSelector
          value={valor.resposta}
          onChange={(resposta) => onChange({ ...valor, resposta })}
        />
      </div>

      {valor.resposta && (item.exige_foto || precisaObs || valor.resposta === 'nao_ok') && (
        <div className="pl-0 space-y-2.5 pt-1">
          {(item.exige_foto || valor.resposta === 'nao_ok') && (
            <FotoUpload
              bucket="checklist-fotos"
              pasta={pastaStorage}
              fotos={valor.fotos}
              onChange={(fotos) => onChange({ ...valor, fotos })}
              obrigatorio={item.exige_foto}
            />
          )}

          {(precisaObs || valor.resposta === 'nao_ok') && (
            <textarea
              value={valor.observacao}
              onChange={(e) => onChange({ ...valor, observacao: e.target.value })}
              placeholder={precisaObs ? 'Descreva o problema encontrado (obrigatório)' : 'Observação (opcional)'}
              rows={2}
              className={`w-full text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                obsFaltando ? 'border-orange-300 bg-orange-50' : 'border-slate-200'
              }`}
            />
          )}

          {(obsFaltando || fotoFaltando) && (
            <p className="text-xs text-orange-500">
              {obsFaltando && 'Observação obrigatória. '}
              {fotoFaltando && 'Foto obrigatória.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
