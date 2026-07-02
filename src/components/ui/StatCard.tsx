import { cn } from '@/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'orange' | 'purple' | 'slate'
  onClick?: () => void
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    ring: 'bg-blue-100',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    ring: 'bg-green-100',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    ring: 'bg-red-100',
  },
  yellow: {
    bg: 'bg-yellow-50',
    icon: 'text-yellow-600',
    ring: 'bg-yellow-100',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'text-orange-600',
    ring: 'bg-orange-100',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    ring: 'bg-purple-100',
  },
  slate: {
    bg: 'bg-slate-50',
    icon: 'text-slate-600',
    ring: 'bg-slate-100',
  },
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  onClick,
}: StatCardProps) {
  const colors = colorMap[color]

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start gap-4',
        onClick && 'cursor-pointer hover:border-slate-300 hover:shadow transition-all'
      )}
      onClick={onClick}
    >
      <div className={cn('p-2.5 rounded-lg', colors.ring)}>
        <Icon className={cn('w-5 h-5', colors.icon)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 font-medium truncate">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5 leading-none">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
