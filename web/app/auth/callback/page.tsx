'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()

    // Il browser client ha accesso al code_verifier PKCE nei cookie.
    // Supabase SSR gestisce automaticamente lo scambio code→session
    // quando detecta i parametri nell'URL (code, o hash fragment).
    // Usiamo onAuthStateChange per aspettare che la sessione sia pronta.

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN') {
          // Sessione attiva — check onboarding
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
      }
    )

    // Fallback: se dopo 5 secondi non è successo niente, prova exchange manuale
    const timeout = setTimeout(async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          console.error('Exchange error:', exchangeError.message)
          setError(exchangeError.message)
          setTimeout(() => router.replace('/login?error=auth_failed'), 2000)
        }
        // Se exchange riesce, onAuthStateChange si attiverà
      } else {
        // Nessun code — forse è un hash fragment (implicit flow) o link non valido
        const hash = window.location.hash
        if (!hash) {
          setError('Link non valido')
          setTimeout(() => router.replace('/login?error=auth_failed'), 2000)
        }
        // Se c'è un hash, @supabase/ssr lo gestisce automaticamente
      }
    }, 1500)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
      {error ? (
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2">Errore di autenticazione</p>
          <p className="text-white/30 text-xs">{error}</p>
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
