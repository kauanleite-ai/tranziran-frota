import { cn } from '@/utils'
import { LucideIcon } from 'lucide-react'

interface Column<T> {
  key: string
  label: string
  className?: string
  render?: (row: T) => React.ReactNode
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
}

export function Table<T>({
  columns,
  data,
  emptyIcon: EmptyIcon,
  emptyTitle = 'Nenhum registro encontrado',
  emptyDescription,
  rowKey,
  onRowClick,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap',
                  col.className
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  {EmptyIcon && (
                    <EmptyIcon className="w-10 h-10 text-slate-300 mb-3" />
                  )}
                  <p className="text-slate-500 font-medium text-sm">{emptyTitle}</p>
                  {emptyDescription && (
                    <p className="text-slate-400 text-xs mt-1">{emptyDescription}</p>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn(
                  'hover:bg-slate-50 transition-colors',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn('py-3.5 px-4 text-slate-700', col.className)}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
