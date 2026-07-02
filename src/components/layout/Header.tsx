'use client'

import { Bell } from 'lucide-react'
import { cn } from '@/utils'

interface HeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export function Header({ title, subtitle, action, className }: HeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between py-5 px-6 border-b border-slate-200 bg-white',
        className
      )}
    >
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        {action}
      </div>
    </header>
  )
}
