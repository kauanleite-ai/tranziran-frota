'use client'

import { AlertTriangle, Camera } from 'lucide-react'
import { FotoUpload } from '@/components/checklists/FotoUpload'
import { MobileStatusButtons } from './MobileStatusButtons'
import type { RespostaEmEdicao } from '@/components/checklists/ItemLinha'

interface Props {
  numero: number
  total: number
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

export function MobileChecklistItem({ numero, total, item, valor, onChange, pastaStorage }: Props) {
  const fotoObrigatoria = (item.exige_foto || valor.resposta === 'nao_ok') && valor.resposta !== null
  const obsObrigatoria = valor.resposta === 'nao_ok'
  const faltaFoto = fotoObrigatoria && valor.fotos.length === 0
  const faltaObs = obsObrigatoria && !valor.observacao.trim()

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Item {numero} de {total}</p>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold leading-tight text-slate-950">{item.nome}</h3>
            {item.item_critico && <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />}
          </div>
          {item.descricao && <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.descricao}</p>}
        </div>
      </div>

      <MobileStatusButtons
        value={valor.resposta}
        onChange={(resposta) => onChange({ ...valor, resposta })}
      />

      {valor.resposta && (
        <div className="mt-4 space-y-3">
          {(fotoObrigatoria || item.exige_foto) && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                <Camera className="h-4 w-4" />
                Fotos {fotoObrigatoria && <span className="text-red-500">obrigatórias</span>}
              </div>
              <FotoUpload
                bucket="checklist-fotos"
                pasta={pastaStorage}
                fotos={valor.fotos}
                onChange={(fotos) => onChange({ ...valor, fotos })}
                obrigatorio={fotoObrigatoria}
                maxFotos={4}
              />
            </div>
          )}

          {(valor.resposta === 'nao_ok' || item.exige_obs_se_nao_ok) && (
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Observação {obsObrigatoria && <span className="text-red-500">obrigatória</span>}
              </label>
              <textarea
                value={valor.observacao}
                onChange={(e) => onChange({ ...valor, observacao: e.target.value })}
                placeholder="Descreva o que foi encontrado..."
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          )}

          {(faltaFoto || faltaObs) && (
            <p className="rounded-2xl bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700">
              {faltaFoto && 'Foto obrigatória pendente. '}
              {faltaObs && 'Observação obrigatória pendente.'}
            </p>
          )}
        </div>
      )}
    </article>
  )
}
