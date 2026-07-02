'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Truck, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)

    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      setErro('E-mail ou senha inválidos.')
      setCarregando(false)
      return
    }

    const userId = data.user?.id

    if (userId) {
      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('perfil')
        .eq('user_id', userId)
        .maybeSingle()

      if (perfil?.perfil === 'motorista' || perfil?.perfil === 'conferente') {
        router.push('/mobile')
        router.refresh()
        return
      }
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Painel lateral */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-blue-600 to-blue-900 p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl">Tranziran</span>
        </div>

        <div>
          <h1 className="text-white text-4xl font-bold leading-tight mb-4">
            Sistema de Checklist e Auditoria de Frota
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed">
            Controle completo do estado dos seus veículos. Auditorias quinzenais,
            ocorrências rastreadas e histórico imutável.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Veículos', sub: 'monitorados' },
            { label: 'Auditorias', sub: 'quinzenais' },
            { label: 'Histórico', sub: 'completo' },
          ].map((item) => (
            <div key={item.label} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white font-semibold text-sm">{item.label}</p>
              <p className="text-blue-200 text-xs mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Formulário de login */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Truck className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg">Tranziran</span>
          </div>

          <h2 className="text-white text-2xl font-bold mb-1">Entrar</h2>
          <p className="text-slate-400 text-sm mb-8">
            Acesse com seu e-mail e senha
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com.br"
                required
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {mostrarSenha ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {erro && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-3.5 py-2.5">
                <p className="text-red-400 text-sm">{erro}</p>
              </div>
            )}

            <Button
              type="submit"
              loading={carregando}
              className="w-full mt-2"
              size="lg"
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="text-slate-500 text-xs text-center mt-8">
            Tranziran Frota © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
