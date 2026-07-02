import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatarData(data: string | Date | null | undefined): string {
  if (!data) return '—'
  const d = typeof data === 'string' ? new Date(data) : data
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatarDataHora(data: string | Date | null | undefined): string {
  if (!data) return '—'
  const d = typeof data === 'string' ? new Date(data) : data
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatarKm(km: number | null | undefined): string {
  if (km == null) return '—'
  return `${km.toLocaleString('pt-BR')} km`
}

export function formatarPlaca(placa: string): string {
  return placa.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function diasAteVencer(data: string | null | undefined): number | null {
  if (!data) return null
  const diff = new Date(data).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
