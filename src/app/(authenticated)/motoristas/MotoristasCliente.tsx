'use client'

import { useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, Pencil, Trash2, AlertTriangle, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Table } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { MotoristaForm } from '@/components/motoristas/MotoristaForm'
import { criarMotorista, atualizarMotorista, excluirMotorista, importarMotoristasEmMassa } from '@/lib/actions/motoristas'
import type { MotoristaFormData } from '@/lib/actions/motoristas'
import { formatarData, diasAteVencer } from '@/utils'
import { baixarCsv, normalizarTexto, parseCsv, textoBooleano } from '@/lib/csv'

type Motorista = {
  id: string; nome: string; matricula: string; cpf: string | null
  telefone: string | null; cnh: string | null; cnh_validade: string | null
  mopp: boolean; mopp_validade: string | null; status: string
  empresas: { id: string; nome: string } | null
  unidades: { id: string; nome: string } | null
}

type Empresa = { id: string; nome: string }
type Unidade = { id: string; nome: string; empresa_id: string }

interface Props {
  motoristasIniciais: Motorista[]
  empresas: Empresa[]
  unidades: Unidade[]
}

const statusBadge: Record<string, 'green' | 'gray' | 'yellow' | 'orange'> = {
  ativo: 'green', inativo: 'gray', ferias: 'yellow', afastado: 'orange',
}

const statusLabel: Record<string, string> = {
  ativo: 'Ativo', inativo: 'Inativo', ferias: 'Férias', afastado: 'Afastado',
}

const STATUS_MOTORISTA_IMPORT = Object.keys(statusLabel)

export function MotoristasCliente({ motoristasIniciais, empresas, unidades }: Props) {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const inputCsvRef = useRef<HTMLInputElement>(null)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [modalCriar, setModalCriar] = useState(false)
  const [motorEditar, setMotorEditar] = useState<Motorista | null>(null)
  const [excluindo, setExcluindo] = useState<string | null>(null)

  const filtrados = useMemo(() => {
    return motoristasIniciais.filter((m) => {
      const t = busca.toLowerCase()
      const matchBusca = !busca || m.nome.toLowerCase().includes(t) || m.matricula.toLowerCase().includes(t)
      const matchStatus = !filtroStatus || m.status === filtroStatus
      return matchBusca && matchStatus
    })
  }, [motoristasIniciais, busca, filtroStatus])

  async function handleCriar(data: MotoristaFormData) {
    await criarMotorista(data)
    success('Motorista cadastrado!')
    setModalCriar(false)
    router.refresh()
  }

  async function handleEditar(data: MotoristaFormData) {
    if (!motorEditar) return
    await atualizarMotorista(motorEditar.id, data)
    success('Motorista atualizado!')
    setMotorEditar(null)
    router.refresh()
  }

  async function handleExcluir(id: string) {
    if (!confirm('Excluir este motorista?')) return
    setExcluindo(id)
    try {
      await excluirMotorista(id)
      success('Motorista excluído.')
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao excluir.')
    } finally {
      setExcluindo(null)
    }
  }

  function baixarModeloCsv() {
    baixarCsv(
      'modelo_importacao_motoristas.csv',
      ['nome', 'matricula', 'cpf', 'telefone', 'cnh', 'cnh_validade', 'mopp', 'mopp_validade', 'status', 'empresa', 'unidade'],
      [
        ['João da Silva', '0001', '12345678900', '21999999999', '12345678901', '2027-12-31', 'sim', '2027-12-31', 'ativo', empresas[0]?.nome ?? 'Tranziran', unidades[0]?.nome ?? ''],
        ['Maria Souza', '0002', '', '21988888888', '', '', 'nao', '', 'ativo', empresas[0]?.nome ?? 'Tranziran', unidades[0]?.nome ?? ''],
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
        const status = normalizarTexto(linha.status || 'ativo')

        if (!linha.nome) errosPreparacao.push(`Linha ${numeroLinha}: nome obrigatório.`)
        if (!linha.matricula) errosPreparacao.push(`Linha ${numeroLinha}: matrícula obrigatória.`)
        if (!empresa) errosPreparacao.push(`Linha ${numeroLinha}: empresa não encontrada.`)
        if (!STATUS_MOTORISTA_IMPORT.includes(status)) errosPreparacao.push(`Linha ${numeroLinha}: status inválido (${linha.status}).`)
        if (linha.unidade && !unidade) errosPreparacao.push(`Linha ${numeroLinha}: unidade não encontrada (${linha.unidade}).`)

        return {
          linha: numeroLinha,
          nome: linha.nome,
          matricula: linha.matricula,
          cpf: linha.cpf || undefined,
          telefone: linha.telefone || undefined,
          empresa_id: empresa?.id ?? '',
          unidade_id: unidade?.id ?? '',
          cnh: linha.cnh || undefined,
          cnh_validade: linha.cnh_validade || undefined,
          mopp: textoBooleano(linha.mopp),
          mopp_validade: linha.mopp_validade || undefined,
          status,
        }
      })

      if (errosPreparacao.length > 0) {
        alert(`Corrija o CSV antes de importar:

${errosPreparacao.slice(0, 20).join('\n')}`)
        return
      }

      if (!confirm(`Importar ${registros.length} motorista(s) do CSV?`)) return

      const resultado = await importarMotoristasEmMassa(registros)
      if (resultado.erros.length > 0) {
        alert(`Importação concluída com alertas.

Criados: ${resultado.criados}
Erros: ${resultado.erros.length}

${resultado.erros.slice(0, 20).map((e) => `Linha ${e.linha}: ${e.mensagem}`).join('\n')}`)
      } else {
        success(`${resultado.criados} motorista(s) importado(s) com sucesso!`)
      }
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao importar CSV.')
    } finally {
      if (inputCsvRef.current) inputCsvRef.current.value = ''
    }
  }

  function alertaCNH(m: Motorista): React.ReactNode {
    if (!m.cnh_validade) return <span className="text-slate-400 text-xs">—</span>
    const dias = diasAteVencer(m.cnh_validade)
    if (dias === null) return null
    if (dias < 0) return <Badge variant="red">CNH vencida</Badge>
    if (dias <= 30) return <Badge variant="yellow">{dias}d para vencer</Badge>
    return <span className="text-xs text-slate-500">{formatarData(m.cnh_validade)}</span>
  }

  const statusOptions = [
    { value: '', label: 'Todos os status' },
    ...Object.entries(statusLabel).map(([v, l]) => ({ value: v, label: l })),
  ]

  return (
    <div className="flex-1 p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={busca} onChange={setBusca} placeholder="Buscar por nome ou matrícula..." className="w-64" />
        <Select options={statusOptions} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-44" />
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
            Novo motorista
          </Button>
        </div>
      </div>

      <Card padding="none">
        <Table
          data={filtrados}
          rowKey={(m) => m.id}
          emptyIcon={Users}
          emptyTitle="Nenhum motorista encontrado"
          emptyDescription="Cadastre o primeiro motorista"
          columns={[
            {
              key: 'nome',
              label: 'Nome / Matrícula',
              render: (m) => (
                <div>
                  <p className="font-semibold text-slate-900">{m.nome}</p>
                  <p className="text-xs text-slate-400">Matrícula: {m.matricula}</p>
                </div>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (m) => (
                <Badge variant={statusBadge[m.status] ?? 'gray'}>
                  {statusLabel[m.status] ?? m.status}
                </Badge>
              ),
            },
            {
              key: 'cnh_validade',
              label: 'Validade CNH',
              render: (m) => alertaCNH(m),
            },
            {
              key: 'mopp',
              label: 'MOPP',
              render: (m) => {
                if (!m.mopp) return <span className="text-slate-300 text-xs">Não</span>
                const dias = diasAteVencer(m.mopp_validade)
                if (dias !== null && dias < 0) return <Badge variant="red">Vencido</Badge>
                if (dias !== null && dias <= 30) return <Badge variant="yellow">{dias}d</Badge>
                return <Badge variant="green">Sim</Badge>
              },
            },
            {
              key: 'telefone',
              label: 'Telefone',
              render: (m) => <span className="text-slate-500 text-sm">{m.telefone ?? '—'}</span>,
            },
            {
              key: 'unidade',
              label: 'Base',
              render: (m) => (
                <span className="text-slate-500 text-sm">
                  {m.unidades?.nome ?? m.empresas?.nome ?? '—'}
                </span>
              ),
            },
            {
              key: 'acoes',
              label: '',
              className: 'w-20',
              render: (m) => (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setMotorEditar(m)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleExcluir(m.id)}
                    disabled={excluindo === m.id}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Alertas de vencimento */}
      {motoristasIniciais.some((m) => {
        const d = diasAteVencer(m.cnh_validade)
        return d !== null && d <= 30
      }) && (
        <div className="flex items-start gap-3 p-3.5 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
          <p className="text-sm text-yellow-700">
            Existem motoristas com CNH vencida ou próxima do vencimento. Verifique a coluna &quot;Validade CNH&quot;.
          </p>
        </div>
      )}

      {/* Modal criar */}
      <Modal open={modalCriar} onClose={() => setModalCriar(false)} title="Novo Motorista" size="lg">
        <MotoristaForm empresas={empresas} unidades={unidades} onSave={handleCriar} onCancel={() => setModalCriar(false)} />
      </Modal>

      {/* Modal editar */}
      <Modal open={!!motorEditar} onClose={() => setMotorEditar(null)} title="Editar Motorista" description={motorEditar?.nome} size="lg">
        {motorEditar && (
          <MotoristaForm
            inicial={{
              id: motorEditar.id,
              nome: motorEditar.nome,
              matricula: motorEditar.matricula,
              cpf: motorEditar.cpf ?? '',
              telefone: motorEditar.telefone ?? '',
              empresa_id: motorEditar.empresas?.id ?? '',
              unidade_id: motorEditar.unidades?.id ?? '',
              cnh: motorEditar.cnh ?? '',
              cnh_validade: motorEditar.cnh_validade ?? '',
              mopp: motorEditar.mopp,
              mopp_validade: motorEditar.mopp_validade ?? '',
              status: motorEditar.status,
            }}
            empresas={empresas}
            unidades={unidades}
            onSave={handleEditar}
            onCancel={() => setMotorEditar(null)}
          />
        )}
      </Modal>
    </div>
  )
}
