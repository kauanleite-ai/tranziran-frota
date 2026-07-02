import { createClient } from '@/lib/supabase/client'

export type FotoUploadResult = {
  storage_path: string
  nome_original: string
  tamanho_bytes: number
  mime_type: string
}

const MAX_DIMENSAO = 1600 // px — redimensiona fotos grandes antes do upload
const QUALIDADE_JPEG = 0.82

/**
 * Comprime uma imagem no browser (canvas) antes do upload,
 * preservando qualidade visual razoável e reduzindo o tamanho do arquivo.
 */
async function comprimirImagem(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      if (width > MAX_DIMENSAO || height > MAX_DIMENSAO) {
        const ratio = Math.min(MAX_DIMENSAO / width, MAX_DIMENSAO / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Não foi possível processar a imagem.'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Falha ao comprimir imagem.'))
        },
        'image/jpeg',
        QUALIDADE_JPEG
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível carregar a imagem.'))
    }

    img.src = url
  })
}

/**
 * Faz upload de uma foto para um bucket do Supabase Storage.
 * Aceita imagens grandes — comprime automaticamente antes de enviar.
 */
export async function uploadFoto(
  file: File,
  bucket: 'checklist-fotos' | 'auditoria-fotos' | 'ocorrencia-fotos' | 'assinaturas',
  pasta: string
): Promise<FotoUploadResult> {
  const supabase = createClient()

  let arquivoFinal: Blob = file
  let mimeType = file.type

  // Comprime apenas imagens (não assinaturas PNG transparentes pequenas)
  if (file.type.startsWith('image/') && file.type !== 'image/png') {
    try {
      arquivoFinal = await comprimirImagem(file)
      mimeType = 'image/jpeg'
    } catch {
      // Se a compressão falhar, envia o arquivo original
      arquivoFinal = file
    }
  }

  const extensao = mimeType === 'image/jpeg' ? 'jpg' : file.name.split('.').pop() || 'jpg'
  const nomeArquivo = `${pasta}/${crypto.randomUUID()}.${extensao}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(nomeArquivo, arquivoFinal, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw new Error(`Erro ao enviar foto: ${error.message}`)

  return {
    storage_path: nomeArquivo,
    nome_original: file.name,
    tamanho_bytes: arquivoFinal.size,
    mime_type: mimeType,
  }
}

export async function obterUrlFotoAsync(bucket: string, path: string): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
  if (error || !data) return ''
  return data.signedUrl
}
