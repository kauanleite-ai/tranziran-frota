'use client'

import { useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Truck, Pencil, Trash2, Eye, CheckCircle2, AlertCircle, Clock, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Table } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { VeiculoForm } from '@/components/veiculos/VeiculoForm'
import { criarVeiculo, atualizarVeiculo, excluirVeiculo, importarVeiculosEmMassa } from '@/lib/actions/veiculos'
import type { VeiculoFormData } from '@/lib/actions/veiculos'
import { TIPO_VEICULO_LABEL, STATUS_VEICULO_LABEL } from '@/lib/constants'
import { baixarCsv, normalizarTexto, parseCsv } from '@/lib/csv'
import { formatarData, diasAteVencer } from '@/utils'

type Veiculo = {
  id: string
  placa: string
  codigo_frota: string | null
  tipo: string
  fabricante: string | null
  modelo: string | null
  ano: number | null
  status: string
  km_atual: number | null
  checklist_base_concluido: boolean
  data_proxima_auditoria: string | null
  empresas: { id: string; nome: string } | null
  unidades: { id: string; nome: string } | null
}

type Empresa = { id: string; nome: string }
type Unidade = { id: string; nome: string; empresa_id: string }

interface VeiculosClienteProps {
  veiculosIniciais: Veiculo[]
  empresas: Empresa[]
  unidades: Unidade[]
}

const statusBadge: Record<string, 'green' | 'red' | 'yellow' | 'gray'> = {
  ativo: 'green',
  inativo: 'gray',
  manutencao: 'yellow',
  vendido: 'red',
}

const TIPO_VEICULO_IMPORT = Object.keys(TIPO_VEICULO_LABEL)
const STATUS_VEICULO_IMPORT = Object.keys(STATUS_VEICULO_LABEL)

export function VeiculosCliente({ veiculosIniciais, empresas, unidades }: VeiculosClienteProps) {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const inputCsvRef = useRef<HTMLInputElement>(null)

  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [modalCriar, setModalCriar] = useState(false)
  const [veiculoEditando, setVeiculoEditando] = useState<Veiculo | null>(null)
  const [excluindo, setExcluindo] = useState<string | null>(null)

  const veiculosFiltrados = useMemo(() => {
    return veiculosIniciais.filter((v) => {
      const termo = busca.toLowerCase()
      const matchBusca =
        !busca ||
        v.placa.toLowerCase().includes(termo) ||
        (v.codigo_frota ?? '').toLowerCase().includes(termo) ||
        (v.modelo ?? '').toLowerCase().includes(termo) ||
        (v.fabricante ?? '').toLowerCase().includes(termo)
      const matchStatus = !filtroStatus || v.status === filtroStatus
      const matchTipo = !filtroTipo || v.tipo === filtroTipo
      return matchBusca && matchStatus && matchTipo
    })
  }, [veiculosIniciais, busca, filtroStatus, filtroTipo])

  async function handleCriar(data: VeiculoFormData) {
    await criarVeiculo(data)
    success('Veículo cadastrado com sucesso!')
    setModalCriar(false)
    router.refresh()
  }

  async function handleEditar(data: VeiculoFormData) {
    if (!veiculoEditando) return
    await atualizarVeiculo(veiculoEditando.id, data)
    success('Veículo atualizado com sucesso!')
    setVeiculoEditando(null)
    router.refresh()
  }

  async function handleExcluir(id: string) {
    if (!confirm('Tem certeza que deseja excluir este veículo?')) return
    setExcluindo(id)
    try {
      await excluirVeiculo(id)
      success('Veículo excluído.')
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao excluir.')
    } finally {
      setExcluindo(null)
    }
  }

  function baixarModeloCsv() {
    baixarCsv(
      'modelo_importacao_veiculos.csv',
      ['placa', 'codigo_frota', 'tipo', 'fabricante', 'modelo', 'ano', 'km_atual', 'status', 'empresa', 'unidade'],
      [
        ['ABC1D23', '001', 'cavalo', 'Volvo', 'FH 540', '2022', '100000', 'ativo', empresas[0]?.nome ?? 'Tranziran', unidades[0]?.nome ?? ''],
        ['DEF4G56', '002', 'carreta', 'Randon', 'Carreta 3 eixos', '2020', '', 'ativo', empresas[0]?.nome ?? 'Tranziran', unidades[0]?.nome ?? ''],
      ]
    )
  }

  async function handleImportarCsv(arquivo: File) {
    try {
      const texto = await arquivo.text()
      const linhas = parseCsv(texto)

      if (linhas.length === 0) {
        toastError('O arquivo CSV está vazio ou sem linhas para importar.')
        return
      }

      const errosPreparacao: string[] = []
      const registros = linhas.map((linha, index) => {
        const numeroLinha = index + 2
        const empresaNome = linha.empresa || empresas[0]?.nome || ''
        const empresa = empresas.find((e) => normalizarTexto(e.nome) === normalizarTexto(empresaNome)) ?? empresas[0]
        const unidade = linha.unidade
          ? unidades.find((u) => normalizarTexto(u.nome) === normalizarTexto(linha.unidade) && (!empresa || u.empresa_id === empresa.id))
          : undefined
        const tipo = normalizarTexto(linha.tipo || 'cavalo')
        const status = normalizarTexto(linha.status || 'ativo')

        if (!linha.placa) errosPreparacao.push(`Linha ${numeroLinha}: placa obrigatória.`)
        if (!empresa) errosPreparacao.push(`Linha ${numeroLinha}: empresa não encontrada.`)
        if (!TIPO_VEICULO_IMPORT.includes(tipo)) errosPreparacao.push(`Linha ${numeroLinha}: tipo inválido (${linha.tipo}).`)
        if (!STATUS_VEICULO_IMPORT.includes(status)) errosPreparacao.push(`Linha ${numeroLinha}: status inválido (${linha.status}).`)
        if (linha.unidade && !unidade) errosPreparacao.push(`Linha ${numeroLinha}: unidade não encontrada (${linha.unidade}).`)

        return {
          linha: numeroLinha,
          placa: linha.placa,
          codigo_frota: linha.codigo_frota || undefined,
          empresa_id: empresa?.id ?? '',
          unidade_id: unidade?.id ?? '',
          tipo,
          fabricante: linha.fabricante || undefined,
          modelo: linha.modelo || undefined,
          ano: linha.ano ? Number(linha.ano) : undefined,
          km_atual: linha.km_atual ? Number(linha.km_atual) : undefined,
          status,
        }
      })

      if (errosPreparacao.length > 0) {
        alert(`Corrija o CSV antes de importar:

${errosPreparacao.slice(0, 20).join('\n')}`)
        return
      }

      if (!confirm(`Importar ${registros.length} veículo(s) do CSV?`)) return

      const resultado = await importarVeiculosEmMassa(registros)
      if (resultado.erros.length > 0) {
        alert(`Importação concluída com alertas.

Criados: ${resultado.criados}
Erros: ${resultado.erros.length}

${resultado.erros.slice(0, 20).map((e) => `Linha ${e.linha}: ${e.mensagem}`).join('\n')}`)
      } else {
        success(`${resultado.criados} veículo(s) importado(s) com sucesso!`)
      }
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao importar CSV.')
    } finally {
      if (inputCsvRef.current) inputCsvRef.current.value = ''
    }
  }

  function statusAuditoria(v: Veiculo): React.ReactNode {
    if (!v.checklist_base_concluido) {
      return <Badge variant="orange">Sem checklist base</Badge>
    }
    if (!v.data_proxima_auditoria) {
      return <Badge variant="gray">—</Badge>
    }
    const dias = diasAteVencer(v.data_proxima_auditoria)
    if (dias === null) return <Badge variant="gray">—</Badge>
    if (dias < 0) return <Badge variant="red">Vencida</Badge>
    if (dias <= 7) return <Badge variant="yellow">{dias}d para vencer</Badge>
    return (
      <span className="text-xs text-slate-500">{formatarData(v.data_proxima_auditoria)}</span>
    )
  }

  const statusOptions = [
    { value: '', label: 'Todos os status' },
    ...Object.entries(STATUS_VEICULO_LABEL).map(([v, l]) => ({ value: v, label: l })),
  ]
  const tipoOptions = [
    { value: '', label: 'Todos os tipos' },
    ...Object.entries(TIPO_VEICULO_LABEL).map(([v, l]) => ({ value: v, label: l })),
  ]

  return (
    <div className="flex-1 p-6 space-y-4">
      {/* Filtros e ação */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={busca}
          onChange={setBusca}
          placeholder="Buscar por placa, modelo..."
          className="w-64"
        />
        <Select
          options={statusOptions}
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="w-44"
        />
        <Select
          options={tipoOptions}
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="w-44"
        />
        <div className="ml-auto flex items-center gap-2">
          <input
            ref={inputCsvRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0]
              if (arquivo) void handleImportarCsv(arquivo)
            }}
          />
          <Button variant="outline" onClick={baixarModeloCsv}>
            <Download className="w-4 h-4" />
            Modelo CSV
          </Button>
          <Button variant="outline" onClick={() => inputCsvRef.current?.click()}>
            <Upload className="w-4 h-4" />
            Importar CSV
          </Button>
          <Button onClick={() => setModalCriar(true)}>
            <Plus className="w-4 h-4" />
            Novo veículo
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <Card padding="none">
        <Table
          data={veiculosFiltrados}
          rowKey={(v) => v.id}
          emptyIcon={Truck}
          emptyTitle="Nenhum veículo encontrado"
          emptyDescription="Cadastre o primeiro veículo clicando em 'Novo veículo'"
          onRowClick={(v) => router.push(`/veiculos/${v.id}`)}
          columns={[
            {
              key: 'placa',
              label: 'Placa / Frota',
              render: (v) => (
                <div>
                  <p className="font-semibold text-slate-900 font-mono">{v.placa}</p>
                  {v.codigo_frota && (
                    <p className="text-xs text-slate-400">#{v.codigo_frota}</p>
                  )}
                </div>
              ),
            },
            {
              key: 'tipo',
              label: 'Tipo',
              render: (v) => (
                <span className="text-slate-700">
                  {TIPO_VEICULO_LABEL[v.tipo as keyof typeof TIPO_VEICULO_LABEL] ?? v.tipo}
                </span>
              ),
            },
            {
              key: 'modelo',
              label: 'Veículo',
              render: (v) => (
                <div>
                  <p className="text-slate-700">{v.fabricante} {v.modelo}</p>
                  {v.ano && <p className="text-xs text-slate-400">{v.ano}</p>}
                </div>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (v) => (
                <Badge variant={statusBadge[v.status] ?? 'gray'}>
                  {STATUS_VEICULO_LABEL[v.status as keyof typeof STATUS_VEICULO_LABEL] ?? v.status}
                </Badge>
              ),
            },
            {
              key: 'km_atual',
              label: 'KM',
              render: (v) => (
                <span className="text-slate-600 text-sm">
                  {v.km_atual ? v.km_atual.toLocaleString('pt-BR') : '—'}
                </span>
              ),
            },
            {
              key: 'auditoria',
              label: 'Próx. Auditoria',
              render: (v) => statusAuditoria(v),
            },
            {
              key: 'unidade',
              label: 'Base',
              render: (v) => (
                <span className="text-slate-500 text-sm">
                  {v.unidades?.nome ?? v.empresas?.nome ?? '—'}
                </span>
              ),
            },
            {
              key: 'acoes',
              label: '',
              className: 'w-24',
              render: (v) => (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => router.push(`/veiculos/${v.id}`)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Ver detalhes"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setVeiculoEditando(v)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleExcluir(v.id)}
                    disabled={excluindo === v.id || v.checklist_base_concluido}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={v.checklist_base_concluido ? 'Veículo com checklist não pode ser excluído' : 'Excluir'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Legenda rápida */}
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Checklist base concluído
        </span>
        <span className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-orange-400" /> Sem checklist base
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-yellow-500" /> Auditoria próxima
        </span>
      </div>

      {/* Modal — Criar */}
      <Modal
        open={modalCriar}
        onClose={() => setModalCriar(false)}
        title="Novo Veículo"
        description="Preencha os dados do veículo para cadastrá-lo no sistema"
        size="lg"
      >
        <VeiculoForm
          empresas={empresas}
          unidades={unidades}
          onSave={handleCriar}
          onCancel={() => setModalCriar(false)}
        />
      </Modal>

      {/* Modal — Editar */}
      <Modal
        open={!!veiculoEditando}
        onClose={() => setVeiculoEditando(null)}
        title="Editar Veículo"
        description={veiculoEditando?.placa}
        size="lg"
      >
        {veiculoEditando && (
          <VeiculoForm
            inicial={{
              id: veiculoEditando.id,
              placa: veiculoEditando.placa,
              codigo_frota: veiculoEditando.codigo_frota ?? '',
              empresa_id: veiculoEditando.empresas?.id ?? '',
              unidade_id: veiculoEditando.unidades?.id ?? '',
              tipo: veiculoEditando.tipo,
              fabricante: veiculoEditando.fabricante ?? '',
              modelo: veiculoEditando.modelo ?? '',
              ano: veiculoEditando.ano ?? undefined,
              status: veiculoEditando.status,
              km_atual: veiculoEditando.km_atual ?? undefined,
            }}
            empresas={empresas}
            unidades={unidades}
            onSave={handleEditar}
            onCancel={() => setVeiculoEditando(null)}
          />
        )}
      </Modal>
    </div>
  )
}
