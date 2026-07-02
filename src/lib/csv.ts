'use client'

export type CsvRow = Record<string, string>

function detectarSeparador(texto: string) {
  const primeiraLinha = texto.split(/\r?\n/)[0] ?? ''
  const pontosEVirgulas = (primeiraLinha.match(/;/g) ?? []).length
  const virgulas = (primeiraLinha.match(/,/g) ?? []).length
  return pontosEVirgulas >= virgulas ? ';' : ','
}

function parseLinhaCsv(linha: string, separador: string) {
  const campos: string[] = []
  let atual = ''
  let dentroAspas = false

  for (let i = 0; i < linha.length; i++) {
    const char = linha[i]
    const proximo = linha[i + 1]

    if (char === '"' && dentroAspas && proximo === '"') {
      atual += '"'
      i++
      continue
    }

    if (char === '"') {
      dentroAspas = !dentroAspas
      continue
    }

    if (char === separador && !dentroAspas) {
      campos.push(atual.trim())
      atual = ''
      continue
    }

    atual += char
  }

  campos.push(atual.trim())
  return campos
}

function normalizarCabecalho(valor: string) {
  return valor
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
}

export function parseCsv(texto: string): CsvRow[] {
  const separador = detectarSeparador(texto)
  const linhas = texto
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((linha) => linha.trim().length > 0)

  if (linhas.length <= 1) return []

  const cabecalhos = parseLinhaCsv(linhas[0], separador).map(normalizarCabecalho)

  return linhas.slice(1).map((linha) => {
    const valores = parseLinhaCsv(linha, separador)
    const row: CsvRow = {}
    cabecalhos.forEach((cabecalho, index) => {
      row[cabecalho] = valores[index]?.trim() ?? ''
    })
    return row
  })
}

function escaparCsv(valor: string | number | boolean | null | undefined) {
  const texto = String(valor ?? '')
  if (texto.includes(';') || texto.includes('"') || texto.includes('\n')) {
    return `"${texto.replace(/"/g, '""')}"`
  }
  return texto
}

export function baixarCsv(nomeArquivo: string, cabecalhos: string[], linhas: Array<Array<string | number | boolean | null | undefined>>) {
  const conteudo = [cabecalhos, ...linhas]
    .map((linha) => linha.map(escaparCsv).join(';'))
    .join('\n')

  const blob = new Blob([`\uFEFF${conteudo}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function normalizarTexto(valor: string | null | undefined) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function textoBooleano(valor: string | null | undefined) {
  const normalizado = normalizarTexto(valor)
  return ['sim', 's', 'true', '1', 'x', 'yes'].includes(normalizado)
}
