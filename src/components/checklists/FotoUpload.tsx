'use client'

import { useState, useRef } from 'react'
import { Camera, X, Loader2, ImageIcon } from 'lucide-react'
import { cn } from '@/utils'
import { uploadFoto, type FotoUploadResult } from '@/lib/storage'
import { useToast } from '@/components/ui/Toast'

interface FotoUploadProps {
  bucket: 'checklist-fotos' | 'auditoria-fotos' | 'ocorrencia-fotos'
  pasta: string
  fotos: FotoUploadResult[]
  onChange: (fotos: FotoUploadResult[]) => void
  obrigatorio?: boolean
  maxFotos?: number
}

export function FotoUpload({ bucket, pasta, fotos, onChange, obrigatorio, maxFotos = 3 }: FotoUploadProps) {
  const { error: toastError } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)
  const [previews, setPreviews] = useState<Map<string, string>>(new Map())

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    if (fotos.length + files.length > maxFotos) {
      toastError(`Máximo de ${maxFotos} foto(s) por item.`)
      return
    }

    setEnviando(true)
    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toastError('Apenas arquivos de imagem são permitidos.')
          continue
        }
        if (file.size > 15 * 1024 * 1024) {
          toastError('Imagem muito grande (máx. 15MB).')
          continue
        }

        const previewUrl = URL.createObjectURL(file)
        const resultado = await uploadFoto(file, bucket, pasta)
        setPreviews((prev) => new Map(prev).set(resultado.storage_path, previewUrl))
        onChange([...fotos, resultado])
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao enviar foto.')
    } finally {
      setEnviando(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function removerFoto(path: string) {
    onChange(fotos.filter((f) => f.storage_path !== path))
    const preview = previews.get(path)
    if (preview) URL.revokeObjectURL(preview)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {fotos.map((foto) => {
          const preview = previews.get(foto.storage_path)
          return (
            <div
              key={foto.storage_path}
              className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 group shrink-0"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={foto.nome_original} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-slate-300" />
                </div>
              )}
              <button
                type="button"
                onClick={() => removerFoto(foto.storage_path)}
                className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          )
        })}

        {fotos.length < maxFotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            className={cn(
              'w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-0.5 transition-colors shrink-0',
              obrigatorio && fotos.length === 0
                ? 'border-orange-300 bg-orange-50 hover:bg-orange-100'
                : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
            )}
          >
            {enviando ? (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            ) : (
              <>
                <Camera className="w-4 h-4 text-slate-400" />
                <span className="text-[9px] text-slate-400">Foto</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {obrigatorio && fotos.length === 0 && (
        <p className="text-xs text-orange-500">Foto obrigatória para este item</p>
      )}
    </div>
  )
}
