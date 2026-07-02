'use client'

import { cn } from '@/utils'
import { Check, Ban, AlertCircle, MinusCircle } from 'lucide-react'

export type StatusResposta = 'ok' | 'nao_tem' | 'nao_ok' | 'nao_aplica'

interface StatusSelectorProps {
  value: StatusResposta | null
  onChange: (value: StatusResposta) => void
}

const OPCOES: { value: StatusResposta; sigla: string; label: string; icon: typeof Check }[] = [
  { value: 'ok', sigla: 'X', label: 'OK', icon: Check },
  { value: 'nao_tem', sigla: 'N', label: 'Não tem', icon: MinusCircle },
  { value: 'nao_ok', sigla: 'A', label: 'Não OK', icon: AlertCircle },
  { value: 'nao_aplica', sigla: 'N/A', label: 'N/A', icon: Ban },
]

const estilos: Record<StatusResposta, { ativo: string; inativo: string }> = {
  ok: {
    ativo: 'bg-green-600 border-green-600 text-white shadow-sm',
    inativo: 'border-slate-200 text-slate-500 hover:border-green-300 hover:bg-green-50',
  },
  nao_tem: {
    ativo: 'bg-slate-600 border-slate-600 text-white shadow-sm',
    inativo: 'border-slate-200 text-slate-500 hover:border-slate-400 hover:bg-slate-50',
  },
  nao_ok: {
    ativo: 'bg-red-600 border-red-600 text-white shadow-sm',
    inativo: 'border-slate-200 text-slate-500 hover:border-red-300 hover:bg-red-50',
  },
  nao_aplica: {
    ativo: 'bg-slate-400 border-slate-400 text-white shadow-sm',
    inativo: 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50',
  },
}

export function StatusSelector({ value, onChange }: StatusSelectorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {OPCOES.map((opt) => {
        const ativo = value === opt.value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            title={opt.label}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all',
              ativo ? estilos[opt.value].ativo : estilos[opt.value].inativo
            )}
          >
            <Icon className="w-3 h-3" />
            {opt.sigla}
          </button>
        )
      })}
    </div>
  )
}
