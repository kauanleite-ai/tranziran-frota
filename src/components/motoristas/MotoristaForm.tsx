'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import type { MotoristaFormData } from '@/lib/actions/motoristas'

interface Empresa { id: string; nome: string }
interface Unidade { id: string; nome: string; empresa_id: string }

interface MotoristaFormProps {
  inicial?: Partial<MotoristaFormData> & { id?: string }
  empresas: Empresa[]
  unidades: Unidade[]
  onSave: (data: MotoristaFormData) => Promise<void>
  onCancel: () => void
}

const STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'ferias', label: 'Férias' },
  { value: 'afastado', label: 'Afastado' },
]

export function MotoristaForm({ inicial, empresas, unidades, onSave, onCancel }: MotoristaFormProps) {
  const { error: toastError } = useToast()
  const [loading, setLoading] = useState(false)
  const [empresaId, setEmpresaId] = useState(inicial?.empresa_id ?? '')
  const [form, setForm] = useState<MotoristaFormData>({
    nome: inicial?.nome ?? '',
    matricula: inicial?.matricula ?? '',
    cpf: inicial?.cpf ?? '',
    telefone: inicial?.telefone ?? '',
    empresa_id: inicial?.empresa_id ?? '',
    unidade_id: inicial?.unidade_id ?? '',
    cnh: inicial?.cnh ?? '',
    cnh_validade: inicial?.cnh_validade ?? '',
    mopp: inicial?.mopp ?? false,
    mopp_validade: inicial?.mopp_validade ?? '',
    status: inicial?.status ?? 'ativo',
  })

  const unidadesFiltradas = unidades.filter((u) => u.empresa_id === empresaId)

  function set(field: keyof MotoristaFormData, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome || !form.matricula || !form.empresa_id) {
      toastError('Preencha nome, matrícula e empresa.')
      return
    }
    setLoading(true)
    try {
      await onSave(form)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar motorista.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nome completo"
          value={form.nome}
          onChange={(e) => set('nome', e.target.value)}
          placeholder="João da Silva"
          required
          className="col-span-2"
        />
        <Input
          label="Matrícula"
          value={form.matricula}
          onChange={(e) => set('matricula', e.target.value)}
          placeholder="Ex: 00123"
          required
        />
        <Input
          label="CPF"
          value={form.cpf ?? ''}
          onChange={(e) => set('cpf', e.target.value)}
          placeholder="000.000.000-00"
        />
      </div>

      <Input
        label="Telefone / WhatsApp"
        value={form.telefone ?? ''}
        onChange={(e) => set('telefone', e.target.value)}
        placeholder="(11) 99999-9999"
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Empresa"
          value={form.empresa_id}
          onChange={(e) => {
            set('empresa_id', e.target.value)
            set('unidade_id', '')
            setEmpresaId(e.target.value)
          }}
          options={empresas.map((e) => ({ value: e.id, label: e.nome }))}
          placeholder="Selecione"
          required
        />
        <Select
          label="Base / Unidade"
          value={form.unidade_id ?? ''}
          onChange={(e) => set('unidade_id', e.target.value)}
          options={[{ value: '', label: 'Sem base' }, ...unidadesFiltradas.map((u) => ({ value: u.id, label: u.nome }))]}
          disabled={!empresaId}
        />
      </div>

      {/* CNH */}
      <div className="pt-2 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Habilitação</p>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Número CNH"
            value={form.cnh ?? ''}
            onChange={(e) => set('cnh', e.target.value)}
            placeholder="00000000000"
          />
          <Input
            label="Validade CNH"
            type="date"
            value={form.cnh_validade ?? ''}
            onChange={(e) => set('cnh_validade', e.target.value)}
          />
        </div>
      </div>

      {/* MOPP */}
      <div className="pt-2 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">MOPP</p>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.mopp}
              onChange={(e) => set('mopp', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">Possui MOPP</span>
          </label>
          {form.mopp && (
            <Input
              label="Validade MOPP"
              type="date"
              value={form.mopp_validade ?? ''}
              onChange={(e) => set('mopp_validade', e.target.value)}
              className="flex-1"
            />
          )}
        </div>
      </div>

      <Select
        label="Status"
        value={form.status}
        onChange={(e) => set('status', e.target.value)}
        options={STATUS_OPTIONS}
        required
      />

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {inicial?.id ? 'Salvar alterações' : 'Cadastrar motorista'}
        </Button>
      </div>
    </form>
  )
}
