'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import {
  TIPO_VEICULO_LABEL,
  STATUS_VEICULO_LABEL,
} from '@/lib/constants'
import type { VeiculoFormData } from '@/lib/actions/veiculos'

interface Empresa { id: string; nome: string }
interface Unidade { id: string; nome: string; empresa_id: string }

interface VeiculoFormProps {
  inicial?: Partial<VeiculoFormData> & { id?: string }
  empresas: Empresa[]
  unidades: Unidade[]
  onSave: (data: VeiculoFormData) => Promise<void>
  onCancel: () => void
}

export function VeiculoForm({ inicial, empresas, unidades, onSave, onCancel }: VeiculoFormProps) {
  const { error: toastError } = useToast()
  const [loading, setLoading] = useState(false)
  const [empresaId, setEmpresaId] = useState(inicial?.empresa_id ?? '')
  const [form, setForm] = useState<VeiculoFormData>({
    placa: inicial?.placa ?? '',
    codigo_frota: inicial?.codigo_frota ?? '',
    empresa_id: inicial?.empresa_id ?? '',
    unidade_id: inicial?.unidade_id ?? '',
    tipo: inicial?.tipo ?? '',
    fabricante: inicial?.fabricante ?? '',
    modelo: inicial?.modelo ?? '',
    ano: inicial?.ano ?? undefined,
    status: inicial?.status ?? 'ativo',
    km_atual: inicial?.km_atual ?? undefined,
  })

  const unidadesFiltradas = unidades.filter((u) => u.empresa_id === empresaId)

  function set(field: keyof VeiculoFormData, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.placa || !form.empresa_id || !form.tipo || !form.status) {
      toastError('Preencha os campos obrigatórios.')
      return
    }
    setLoading(true)
    try {
      await onSave(form)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar veículo.')
    } finally {
      setLoading(false)
    }
  }

  const tipoOptions = Object.entries(TIPO_VEICULO_LABEL).map(([v, l]) => ({ value: v, label: l }))
  const statusOptions = Object.entries(STATUS_VEICULO_LABEL).map(([v, l]) => ({ value: v, label: l }))
  const empresaOptions = empresas.map((e) => ({ value: e.id, label: e.nome }))
  const unidadeOptions = unidadesFiltradas.map((u) => ({ value: u.id, label: u.nome }))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Placa"
          value={form.placa}
          onChange={(e) => set('placa', e.target.value.toUpperCase())}
          placeholder="ABC1234"
          required
          maxLength={8}
        />
        <Input
          label="Código / Frota"
          value={form.codigo_frota ?? ''}
          onChange={(e) => set('codigo_frota', e.target.value)}
          placeholder="Ex: 001"
          hint="Código interno da empresa"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Empresa"
          value={form.empresa_id}
          onChange={(e) => {
            set('empresa_id', e.target.value)
            set('unidade_id', '')
            setEmpresaId(e.target.value)
          }}
          options={empresaOptions}
          placeholder="Selecione"
          required
        />
        <Select
          label="Unidade / Base"
          value={form.unidade_id ?? ''}
          onChange={(e) => set('unidade_id', e.target.value)}
          options={[{ value: '', label: 'Sem unidade' }, ...unidadeOptions]}
          disabled={!empresaId}
        />
      </div>

      <Select
        label="Tipo de veículo"
        value={form.tipo}
        onChange={(e) => set('tipo', e.target.value)}
        options={tipoOptions}
        placeholder="Selecione o tipo"
        required
      />

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Fabricante"
          value={form.fabricante ?? ''}
          onChange={(e) => set('fabricante', e.target.value)}
          placeholder="Ex: Volvo"
        />
        <Input
          label="Modelo"
          value={form.modelo ?? ''}
          onChange={(e) => set('modelo', e.target.value)}
          placeholder="Ex: FH 460"
        />
        <Input
          label="Ano"
          type="number"
          value={form.ano ?? ''}
          onChange={(e) => set('ano', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="2022"
          min={1980}
          max={new Date().getFullYear() + 1}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Status"
          value={form.status}
          onChange={(e) => set('status', e.target.value)}
          options={statusOptions}
          required
        />
        <Input
          label="KM atual"
          type="number"
          value={form.km_atual ?? ''}
          onChange={(e) => set('km_atual', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="Ex: 150000"
          min={0}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {inicial?.id ? 'Salvar alterações' : 'Cadastrar veículo'}
        </Button>
      </div>
    </form>
  )
}
