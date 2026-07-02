'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Truck,
  Users,
  ClipboardCheck,
  ListChecks,
  Search,
  AlertTriangle,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/veiculos',
    label: 'Veículos',
    icon: Truck,
  },
  {
    href: '/motoristas',
    label: 'Motoristas',
    icon: Users,
  },
  {
    href: '/templates',
    label: 'Templates',
    icon: ListChecks,
  },
  {
    href: '/checklists',
    label: 'Checklists',
    icon: ClipboardCheck,
  },
  {
    href: '/auditorias',
    label: 'Auditorias',
    icon: Search,
  },
  {
    href: '/ocorrencias',
    label: 'Ocorrências',
    icon: AlertTriangle,
  },
  {
    href: '/configuracoes',
    label: 'Configurações',
    icon: Settings,
  },
]

interface SidebarProps {
  userName?: string
  userPerfil?: string
}

export function Sidebar({ userName, userPerfil }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-slate-900 flex flex-col transition-all duration-200 z-50',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
        <div className="shrink-0 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <Truck className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-none truncate">
              Tranziran
            </p>
            <p className="text-slate-400 text-xs mt-0.5 truncate">
              Frota & Auditoria
            </p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'ml-auto p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors',
            collapsed && 'mx-auto'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Usuário e logout */}
      <div className="border-t border-slate-800 p-3">
        {!collapsed && (
          <div className="px-1 pb-2">
            <p className="text-white text-xs font-medium truncate">
              {userName || 'Usuário'}
            </p>
            <p className="text-slate-500 text-xs truncate capitalize">
              {userPerfil || 'Perfil'}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg text-sm transition-colors',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}
