import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfil } = await supabase
    .from('usuarios_perfis')
    .select('perfil')
    .eq('user_id', user.id)
    .maybeSingle()

  if (perfil?.perfil === 'motorista' || perfil?.perfil === 'conferente') {
    redirect('/mobile')
  }

  redirect('/dashboard')
}
