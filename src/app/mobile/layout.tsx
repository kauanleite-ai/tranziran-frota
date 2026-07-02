import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <main className="mx-auto min-h-screen w-full max-w-md bg-slate-50 shadow-sm">
        {children}
      </main>
    </div>
  )
}
