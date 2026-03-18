'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    handleCallback()

    async function handleCallback() {
      const supabase = createClient()
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (!code) {
        // Nessun code nell'URL — potrebbe essere hash fragment (implicit flow)
        // oppure link non valido
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          redirectUser(supabase)
          return
        }
        setError('Link non valido o scaduto')
        setTimeout(() => router.replace('/login'), 2000)
        return
      }

      // Scambio code → session (PKCE)
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Auth exchange error:', exchangeError.message)
        setError(`Errore: ${exchangeError.message}`)
        setTimeout(() => router.replace('/login'), 3000)
        return
      }

      // Sessione creata con successo
      redirectUser(supabase)
    }

    async function redirectUser(supabase: ReturnType<typeof createClient>) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()

        if (!profile?.onboarding_completed) {
          router.replace('/onboarding')
          return
        }
      }
      router.replace('/home')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
      {error ? (
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2">Errore di autenticazione</p>
          <p className="text-white/30 text-xs">{error}</p>
          <p className="text-white/20 text-xs mt-4">Reindirizzamento al login...</p>
        </div>
      ) : (
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">Accesso in corso...</p>
        </div>
      )}
    </div>
  )
}
