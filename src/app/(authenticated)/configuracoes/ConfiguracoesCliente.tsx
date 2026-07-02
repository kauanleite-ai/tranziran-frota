'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Building2, MapPin, Pencil, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { criarEmpresa, atualizarEmpresa, criarUnidade, atualizarUnidade } from '@/lib/actions/empresas'

type Empresa = { id: string; nome: string; cnpj: string | null; ativo: boolean }
type Unidade = { id: string; nome: string; cidade: string | null; estado: string | null; ativo: boolean; empresa_id: string; empresas?: { nome: string } | null }

interface Props {
  empresas: Empresa[]
  unidades: Unidade[]
}

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
]

export function ConfiguracoesCliente({ empresas, unidades }: Props) {
  const router = useRouter()
  const { success, error: toastError } = useToast()

  // Empresa states
  const [modalEmpresa, setModalEmpresa] = useState(false)
  const [empresaEditando, setEmpresaEditando] = useState<Empresa | null>(null)
  const [nomeEmpresa, setNomeEmpresa] = useState('')
  const [cnpjEmpresa, setCnpjEmpresa] = useState('')
  const [loadingEmpresa, setLoadingEmpresa] = useState(false)

  // Unidade states
  const [modalUnidade, setModalUnidade] = useState(false)
  const [unidadeEditando, setUnidadeEditando] = useState<Unidade | null>(null)
  const [formUnidade, setFormUnidade] = useState({ empresa_id: '', nome: '', cidade: '', estado: '' })
  const [loadingUnidade, setLoadingUnidade] = useState(false)

  function abrirNovaEmpresa() {
    setEmpresaEditando(null)
    setNomeEmpresa('')
    setCnpjEmpresa('')
    setModalEmpresa(true)
  }

  function abrirEditarEmpresa(e: Empresa) {
    setEmpresaEditando(e)
    setNomeEmpresa(e.nome)
    setCnpjEmpresa(e.cnpj ?? '')
    setModalEmpresa(true)
  }

  async function handleSalvarEmpresa() {
    if (!nomeEmpresa.trim()) return toastError('Informe o nome da empresa.')
    setLoadingEmpresa(true)
    try {
      if (empresaEditando) {
        await atualizarEmpresa(empresaEditando.id, nomeEmpresa, cnpjEmpresa)
        success('Empresa atualizada!')
      } else {
        await criarEmpresa(nomeEmpresa, cnpjEmpresa)
        success('Empresa cadastrada!')
      }
      setModalEmpresa(false)
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar empresa.')
    } finally {
      setLoadingEmpresa(false)
    }
  }

  function abrirNovaUnidade() {
    setUnidadeEditando(null)
    setFormUnidade({ empresa_id: '', nome: '', cidade: '', estado: '' })
    setModalUnidade(true)
  }

  function abrirEditarUnidade(u: Unidade) {
    setUnidadeEditando(u)
    setFormUnidade({ empresa_id: u.empresa_id, nome: u.nome, cidade: u.cidade ?? '', estado: u.estado ?? '' })
    setModalUnidade(true)
  }

  async function handleSalvarUnidade() {
    if (!formUnidade.nome.trim() || !formUnidade.empresa_id) {
      return toastError('Informe nome e empresa da unidade.')
    }
    setLoadingUnidade(true)
    try {
      if (unidadeEditando) {
        await atualizarUnidade(unidadeEditando.id, {
          nome: formUnidade.nome,
          cidade: formUnidade.cidade,
          estado: formUnidade.estado,
        })
        success('Unidade atualizada!')
      } else {
        await criarUnidade(formUnidade.empresa_id, formUnidade.nome, formUnidade.cidade, formUnidade.estado)
        success('Unidade cadastrada!')
      }
      setModalUnidade(false)
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar unidade.')
    } finally {
      setLoadingUnidade(false)
    }
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Empresas */}
      <Card>
        <CardHeader
          title="Empresas"
          description={`${empresas.length} empresa(s) cadastrada(s)`}
          action={
            <Button size="sm" onClick={abrirNovaEmpresa}>
              <Plus className="w-4 h-4" />
              Nova empresa
            </Button>
          }
        />
        <div className="space-y-2">
          {empresas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 className="w-8 h-8 text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">Nenhuma empresa cadastrada</p>
            </div>
          ) : (
            empresas.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-slate-400 shrink-0" />
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{emp.nome}</p>
                    {emp.cnpj && (
                      <p className="text-xs text-slate-400">CNPJ: {emp.cnpj}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {emp.ativo ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-300" />
                  )}
                  <button
                    onClick={() => abrirEditarEmpresa(emp)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Unidades */}
      <Card>
        <CardHeader
          title="Unidades / Bases"
          description={`${unidades.length} unidade(s) cadastrada(s)`}
          action={
            <Button size="sm" onClick={abrirNovaUnidade} disabled={empresas.length === 0}>
              <Plus className="w-4 h-4" />
              Nova unidade
            </Button>
          }
        />
        <div className="space-y-2">
          {unidades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MapPin className="w-8 h-8 text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">Nenhuma unidade cadastrada</p>
            </div>
          ) : (
            unidades.map((uni) => (
              <div
                key={uni.id}
                className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{uni.nome}</p>
                    <p className="text-xs text-slate-400">
                      {uni.empresas?.nome ?? '—'}
                      {uni.cidade && ` · ${uni.cidade}`}
                      {uni.estado && `/${uni.estado}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={uni.ativo ? 'green' : 'gray'}>
                    {uni.ativo ? 'Ativa' : 'Inativa'}
                  </Badge>
                  <button
                    onClick={() => abrirEditarUnidade(uni)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Modal empresa */}
      <Modal
        open={modalEmpresa}
        onClose={() => setModalEmpresa(false)}
        title={empresaEditando ? 'Editar Empresa' : 'Nova Empresa'}
        size="sm"
      >
        <div className="space-y-4">
          <Input label="Nome da empresa" value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} placeholder="Tranziran Transportes" required />
          <Input label="CNPJ" value={cnpjEmpresa} onChange={(e) => setCnpjEmpresa(e.target.value)} placeholder="00.000.000/0001-00" />
          {empresaEditando && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={empresaEditando.ativo}
                onChange={(e) => atualizarEmpresa(empresaEditando.id, nomeEmpresa, cnpjEmpresa, e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Empresa ativa</span>
            </label>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setModalEmpresa(false)}>Cancelar</Button>
            <Button onClick={handleSalvarEmpresa} loading={loadingEmpresa}>
              {empresaEditando ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal unidade */}
      <Modal
        open={modalUnidade}
        onClose={() => setModalUnidade(false)}
        title={unidadeEditando ? 'Editar Unidade' : 'Nova Unidade'}
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Empresa"
            value={formUnidade.empresa_id}
            onChange={(e) => setFormUnidade((p) => ({ ...p, empresa_id: e.target.value }))}
            options={empresas.map((e) => ({ value: e.id, label: e.nome }))}
            placeholder="Selecione a empresa"
            required
            disabled={!!unidadeEditando}
          />
          <Input
            label="Nome da unidade / base"
            value={formUnidade.nome}
            onChange={(e) => setFormUnidade((p) => ({ ...p, nome: e.target.value }))}
            placeholder="Base São Paulo"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cidade"
              value={formUnidade.cidade}
              onChange={(e) => setFormUnidade((p) => ({ ...p, cidade: e.target.value }))}
              placeholder="São Paulo"
            />
            <Select
              label="Estado"
              value={formUnidade.estado}
              onChange={(e) => setFormUnidade((p) => ({ ...p, estado: e.target.value }))}
              options={[{ value: '', label: 'UF' }, ...ESTADOS_BR.map((uf) => ({ value: uf, label: uf }))]}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setModalUnidade(false)}>Cancelar</Button>
            <Button onClick={handleSalvarUnidade} loading={loadingUnidade}>
              {unidadeEditando ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
