'use client'

import { Check, MinusCircle, AlertTriangle, Ban } from 'lucide-react'
import { cn } from '@/utils'
import type { StatusResposta } from '@/components/checklists/StatusSelector'

interface Props {
  value: StatusResposta | null
  onChange: (value: StatusResposta) => void
}

const opcoes: Array<{ value: StatusResposta; titulo: string; sigla: string; icon: typeof Check; ativo: string; inativo: string }> = [
  { value: 'ok', titulo: 'OK', sigla: 'X', icon: Check, ativo: 'border-green-600 bg-green-600 text-white', inativo: 'border-slate-200 bg-white text-slate-700' },
  { value: 'nao_tem', titulo: 'Não tem', sigla: 'N', icon: MinusCircle, ativo: 'border-slate-700 bg-slate-700 text-white', inativo: 'border-slate-200 bg-white text-slate-700' },
  { value: 'nao_ok', titulo: 'Não está OK', sigla: 'A', icon: AlertTriangle, ativo: 'border-red-600 bg-red-600 text-white', inativo: 'border-slate-200 bg-white text-slate-700' },
  { value: 'nao_aplica', titulo: 'N/A', sigla: 'N/A', icon: Ban, ativo: 'border-slate-400 bg-slate-400 text-white', inativo: 'border-slate-200 bg-white text-slate-700' },
]

export function MobileStatusButtons({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {opcoes.map((opcao) => {
        const Icon = opcao.icon
        const ativo = value === opcao.value
        return (
          <button
            key={opcao.value}
            type="button"
            onClick={() => onChange(opcao.value)}
            className={cn(
              'flex h-14 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-bold transition active:scale-[0.98]',
              ativo ? opcao.ativo : opcao.inativo
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{opcao.titulo}</span>
            <span className={cn('rounded-lg px-1.5 py-0.5 text-[10px]', ativo ? 'bg-white/20' : 'bg-slate-100 text-slate-500')}>{opcao.sigla}</span>
          </button>
        )
      })}
    </div>
  )
}
