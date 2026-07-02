import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Busca perfil do usuário
  const { data: perfil } = await supabase
    .from('usuarios_perfis')
    .select('nome, perfil')
    .eq('user_id', user.id)
    .single() as { data: { nome: string; perfil: string } | null }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        userName={perfil?.nome || user.email}
        userPerfil={perfil?.perfil}
      />
      {/* Conteúdo principal — margem ajustada à sidebar */}
      <main className="flex-1 ml-60 min-h-screen flex flex-col transition-all">
        {children}
      </main>
    </div>
  )
}
