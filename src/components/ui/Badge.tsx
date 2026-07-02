import { cn } from '@/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'orange' | 'purple'
  className?: string
}

const variantClasses = {
  green: 'bg-green-100 text-green-700 ring-green-600/20',
  red: 'bg-red-100 text-red-700 ring-red-600/20',
  yellow: 'bg-yellow-100 text-yellow-700 ring-yellow-600/20',
  blue: 'bg-blue-100 text-blue-700 ring-blue-600/20',
  gray: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  orange: 'bg-orange-100 text-orange-700 ring-orange-600/20',
  purple: 'bg-purple-100 text-purple-700 ring-purple-600/20',
}

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
