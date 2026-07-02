'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { TIPO_RESPOSTA_ITEM_LABEL, APLICA_TIPO_LABEL } from '@/lib/constants'
import type { ItemFormData } from '@/lib/actions/templates'

interface ItemFormProps {
  categoriaId: string
  inicial?: Partial<ItemFormData> & { id?: string }
  onSave: (data: ItemFormData) => Promise<void>
  onCancel: () => void
}

const tipoOptions = Object.entries(TIPO_RESPOSTA_ITEM_LABEL).map(([v, l]) => ({ value: v, label: l }))
const aplicaFields = Object.entries(APLICA_TIPO_LABEL) as [keyof typeof APLICA_TIPO_LABEL, string][]

export function ItemForm({ categoriaId, inicial, onSave, onCancel }: ItemFormProps) {
  const { error: toastError } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<ItemFormData>({
    categoria_id: categoriaId,
    nome: inicial?.nome ?? '',
    descricao: inicial?.descricao ?? '',
    tipo_resposta: inicial?.tipo_resposta ?? 'status_padrao',
    exige_foto: inicial?.exige_foto ?? false,
    exige_obs_se_nao_ok: inicial?.exige_obs_se_nao_ok ?? true,
    item_critico: inicial?.item_critico ?? false,
    aplica_cavalo: inicial?.aplica_cavalo ?? true,
    aplica_carreta: inicial?.aplica_carreta ?? true,
    aplica_bau: inicial?.aplica_bau ?? true,
    aplica_truck: inicial?.aplica_truck ?? true,
    aplica_carro_passeio: inicial?.aplica_carro_passeio ?? false,
    aplica_guindaste: inicial?.aplica_guindaste ?? false,
  })

  function set<K extends keyof ItemFormData>(field: K, value: ItemFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) {
      toastError('Informe o nome do item.')
      return
    }
    setLoading(true)
    try {
      await onSave(form)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar item.')
    } finally {
      setLoading(false)
    }
  }

  const algumAplicavel = aplicaFields.some(([field]) => form[field])

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nome do item"
        value={form.nome}
        onChange={(e) => set('nome', e.target.value)}
        placeholder="Ex: Pneus dianteiros (calibragem)"
        required
      />
      <Input
        label="Descrição (opcional)"
        value={form.descricao ?? ''}
        onChange={(e) => set('descricao', e.target.value)}
        placeholder="Detalhe adicional para orientar o preenchimento"
      />

      <Select
        label="Tipo de resposta"
        value={form.tipo_resposta}
        onChange={(e) => set('tipo_resposta', e.target.value)}
        options={tipoOptions}
      />

      {/* Regras booleanas */}
      <div className="grid grid-cols-1 gap-2.5 pt-2 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Regras</p>
        <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
          <div>
            <p className="text-sm text-slate-700 font-medium">Exige foto</p>
            <p className="text-xs text-slate-400">Obrigatório anexar foto ao responder este item</p>
          </div>
          <input
            type="checkbox"
            checked={form.exige_foto}
            onChange={(e) => set('exige_foto', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 shrink-0"
          />
        </label>
        <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
          <div>
            <p className="text-sm text-slate-700 font-medium">Exige observação se não OK</p>
            <p className="text-xs text-slate-400">Obriga texto explicativo quando a resposta for &quot;Não está OK&quot;</p>
          </div>
          <input
            type="checkbox"
            checked={form.exige_obs_se_nao_ok}
            onChange={(e) => set('exige_obs_se_nao_ok', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 shrink-0"
          />
        </label>
        <label className="flex items-center justify-between p-2.5 rounded-lg border border-red-100 bg-red-50/50 cursor-pointer hover:bg-red-50">
          <div>
            <p className="text-sm text-red-700 font-medium">Item crítico</p>
            <p className="text-xs text-red-400">Problemas neste item geram alerta de prioridade alta</p>
          </div>
          <input
            type="checkbox"
            checked={form.item_critico}
            onChange={(e) => set('item_critico', e.target.checked)}
            className="w-4 h-4 text-red-600 rounded border-red-300 shrink-0"
          />
        </label>
      </div>

      {/* Aplicabilidade */}
      <div className="pt-2 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Aplica-se aos tipos de veículo
        </p>
        <div className="grid grid-cols-2 gap-2">
          {aplicaFields.map(([field, label]) => (
            <label
              key={field}
              className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 text-sm"
            >
              <input
                type="checkbox"
                checked={form[field]}
                onChange={(e) => set(field, e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300"
              />
              {label}
            </label>
          ))}
        </div>
        {!algumAplicavel && (
          <p className="text-xs text-orange-500 mt-2">
            Atenção: este item não se aplica a nenhum tipo de veículo e não aparecerá em nenhum checklist.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>
          {inicial?.id ? 'Salvar alterações' : 'Adicionar item'}
        </Button>
      </div>
    </form>
  )
}
