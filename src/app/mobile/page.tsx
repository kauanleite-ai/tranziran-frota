import Link from 'next/link'
import { ClipboardCheck, History, LayoutDashboard, Search, Truck, AlertTriangle, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { MobileHeader } from '@/components/mobile/MobileHeader'

export default async function MobileHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: perfil }, { count: veiculosAtivos }, { count: semBase }, { count: ocorrencias }] = await Promise.all([
    supabase.from('usuarios_perfis').select('nome, perfil').eq('user_id', user?.id).maybeSingle(),
    supabase.from('veiculos').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('veiculos').select('*', { count: 'exact', head: true }).eq('status', 'ativo').eq('checklist_base_concluido', false),
    supabase.from('ocorrencias').select('*', { count: 'exact', head: true }).in('status', ['aberta', 'em_analise', 'aguardando_manutencao']),
  ])

  const nome = perfil?.nome || user?.email || 'Usuário'
  const podeVerPainelAdmin = ['admin', 'frota', 'gestor', 'auditor', 'manutencao'].includes(perfil?.perfil || '')

  return (
    <div className="flex min-h-screen flex-col">
      <MobileHeader title="Tranziran Frota" subtitle="Portal mobile de checklist" />

      <div className="flex-1 space-y-4 p-4 pb-24">
        <section className="rounded-3xl bg-blue-600 p-5 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <UserRound className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-blue-100">Conferente logado</p>
              <h2 className="truncate text-lg font-bold">{nome}</h2>
            </div>
          </div>
          <Link
            href="/mobile/checklists/novo"
            className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-blue-700 shadow-sm active:scale-[0.99]"
          >
            <ClipboardCheck className="h-5 w-5" />
            Iniciar checklist pelo celular
          </Link>
        </section>

        <section className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <Truck className="mb-2 h-4 w-4 text-blue-600" />
            <p className="text-xl font-bold text-slate-950">{veiculosAtivos ?? 0}</p>
            <p className="text-[11px] leading-tight text-slate-500">Veículos ativos</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <Search className="mb-2 h-4 w-4 text-orange-500" />
            <p className="text-xl font-bold text-slate-950">{semBase ?? 0}</p>
            <p className="text-[11px] leading-tight text-slate-500">Sem base</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <AlertTriangle className="mb-2 h-4 w-4 text-red-500" />
            <p className="text-xl font-bold text-slate-950">{ocorrencias ?? 0}</p>
            <p className="text-[11px] leading-tight text-slate-500">Ocorrências</p>
          </div>
        </section>

        <section className="space-y-2">
          <Link href="/mobile/checklists/novo" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Novo checklist</p>
              <p className="text-xs text-slate-500">Buscar placa, informar KM e preencher</p>
            </div>
          </Link>
          <Link href="/mobile/historico" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <History className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Histórico enviado</p>
              <p className="text-xs text-slate-500">Últimos checklists sincronizados</p>
            </div>
          </Link>
          {podeVerPainelAdmin && (
            <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Painel administrativo</p>
                <p className="text-xs text-slate-500">Voltar para o sistema completo</p>
              </div>
            </Link>
          )}
        </section>
      </div>
    </div>
  )
}
