import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Truck,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Camera,
} from 'lucide-react'
import { formatarData } from '@/utils'

async function getDashboardData() {
  const supabase = await createClient()

  const [
    { count: totalVeiculos },
    { count: semChecklistBase },
    { count: auditoriasVencidas },
    { count: ocorrenciasAbertas },
    { count: ocorrenciasCriticas },
    { data: ultimosChecklists },
  ] = await Promise.all([
    supabase
      .from('veiculos')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ativo'),
    supabase
      .from('veiculos')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ativo')
      .eq('checklist_base_concluido', false),
    supabase
      .from('auditoria_agendamentos')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'vencida'),
    supabase
      .from('ocorrencias')
      .select('*', { count: 'exact', head: true })
      .in('status', ['aberta', 'em_analise', 'aguardando_manutencao']),
    supabase
      .from('ocorrencias')
      .select('*', { count: 'exact', head: true })
      .eq('gravidade', 'critica')
      .in('status', ['aberta', 'em_analise', 'aguardando_manutencao']),
    supabase
      .from('checklists')
      .select(`
        id,
        tipo,
        status,
        data_conclusao,
        km,
        veiculos(placa, codigo_frota),
        motoristas(nome)
      `)
      .eq('status', 'concluido')
      .order('data_conclusao', { ascending: false })
      .limit(5),
  ])

  // Auditorias vencendo em 7 dias
  const emSete = new Date()
  emSete.setDate(emSete.getDate() + 7)

  const { count: auditoriasEmBreve } = await supabase
    .from('auditoria_agendamentos')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pendente')
    .lte('data_agendada', emSete.toISOString())
    .gte('data_agendada', new Date().toISOString())

  return {
    totalVeiculos: totalVeiculos ?? 0,
    semChecklistBase: semChecklistBase ?? 0,
    auditoriasVencidas: auditoriasVencidas ?? 0,
    auditoriasEmBreve: auditoriasEmBreve ?? 0,
    ocorrenciasAbertas: ocorrenciasAbertas ?? 0,
    ocorrenciasCriticas: ocorrenciasCriticas ?? 0,
    ultimosChecklists: ultimosChecklists ?? [],
  }
}

export default async function DashboardPage() {
  let dados
  try {
    dados = await getDashboardData()
  } catch {
    // Tabelas ainda não criadas — exibe dashboard vazio
    dados = {
      totalVeiculos: 0,
      semChecklistBase: 0,
      auditoriasVencidas: 0,
      auditoriasEmBreve: 0,
      ocorrenciasAbertas: 0,
      ocorrenciasCriticas: 0,
      ultimosChecklists: [],
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Dashboard"
        subtitle="Visão geral da frota"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Indicadores principais */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Veículos Ativos"
            value={dados.totalVeiculos}
            icon={Truck}
            color="blue"
          />
          <StatCard
            title="Sem Checklist Base"
            value={dados.semChecklistBase}
            subtitle="Aguardando registro inicial"
            icon={ClipboardCheck}
            color={dados.semChecklistBase > 0 ? 'orange' : 'green'}
          />
          <StatCard
            title="Auditorias Vencidas"
            value={dados.auditoriasVencidas}
            subtitle="Precisam ser realizadas"
            icon={XCircle}
            color={dados.auditoriasVencidas > 0 ? 'red' : 'green'}
          />
          <StatCard
            title="Vencem em 7 dias"
            value={dados.auditoriasEmBreve}
            subtitle="Auditorias próximas"
            icon={Clock}
            color={dados.auditoriasEmBreve > 0 ? 'yellow' : 'green'}
          />
        </div>

        {/* Segunda linha de indicadores */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Ocorrências Abertas"
            value={dados.ocorrenciasAbertas}
            subtitle="Em tratamento"
            icon={AlertTriangle}
            color={dados.ocorrenciasAbertas > 0 ? 'orange' : 'green'}
          />
          <StatCard
            title="Ocorrências Críticas"
            value={dados.ocorrenciasCriticas}
            subtitle="Atenção imediata"
            icon={AlertTriangle}
            color={dados.ocorrenciasCriticas > 0 ? 'red' : 'green'}
          />
          <StatCard
            title="Auditorias Concluídas"
            value="—"
            subtitle="Este mês"
            icon={CheckCircle2}
            color="purple"
          />
          <StatCard
            title="Fotos Pendentes"
            value="—"
            subtitle="Aguardando envio"
            icon={Camera}
            color="slate"
          />
        </div>

        {/* Últimos checklists */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader
              title="Últimos Checklists Realizados"
              description="5 mais recentes"
            />
            {dados.ultimosChecklists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ClipboardCheck className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-slate-400 text-sm font-medium">
                  Nenhum checklist realizado ainda
                </p>
                <p className="text-slate-300 text-xs mt-1">
                  Cadastre veículos e inicie o checklist base
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {dados.ultimosChecklists.map((c: Record<string, unknown>) => {
                  const veiculo = c.veiculos as { placa: string; codigo_frota?: string } | null
                  const motorista = c.motoristas as { nome: string } | null
                  return (
                    <div
                      key={c.id as string}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                          <Truck className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-slate-900 text-sm font-medium truncate">
                            {veiculo?.placa ?? '—'}{' '}
                            {veiculo?.codigo_frota ? `(${veiculo.codigo_frota})` : ''}
                          </p>
                          <p className="text-slate-500 text-xs truncate">
                            {motorista?.nome ?? 'Sem motorista'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge variant={c.tipo === 'base' ? 'purple' : c.tipo === 'saida' ? 'blue' : 'green'}>
                          {c.tipo === 'base' ? 'Base' : c.tipo === 'saida' ? 'Saída' : 'Retorno'}
                        </Badge>
                        <span className="text-slate-400 text-xs">
                          {formatarData(c.data_conclusao as string)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Alertas rápidos */}
          <Card>
            <CardHeader
              title="Alertas e Pendências"
              description="Itens que precisam de atenção"
            />
            <div className="space-y-3">
              {dados.semChecklistBase > 0 && (
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <ClipboardCheck className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-orange-700">
                      {dados.semChecklistBase} veículo(s) sem checklist base
                    </p>
                    <p className="text-xs text-orange-500 mt-0.5">
                      Realize o checklist base para começar as auditorias
                    </p>
                  </div>
                </div>
              )}
              {dados.auditoriasVencidas > 0 && (
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                  <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-700">
                      {dados.auditoriasVencidas} auditoria(s) vencida(s)
                    </p>
                    <p className="text-xs text-red-500 mt-0.5">
                      Essas auditorias passaram do prazo de 15 dias
                    </p>
                  </div>
                </div>
              )}
              {dados.ocorrenciasCriticas > 0 && (
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-700">
                      {dados.ocorrenciasCriticas} ocorrência(s) crítica(s)
                    </p>
                    <p className="text-xs text-red-500 mt-0.5">
                      Requerem atenção imediata
                    </p>
                  </div>
                </div>
              )}
              {dados.semChecklistBase === 0 &&
                dados.auditoriasVencidas === 0 &&
                dados.ocorrenciasCriticas === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="w-10 h-10 text-green-400 mb-3" />
                    <p className="text-slate-500 text-sm font-medium">
                      Tudo em ordem!
                    </p>
                    <p className="text-slate-300 text-xs mt-1">
                      Sem pendências críticas no momento
                    </p>
                  </div>
                )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
