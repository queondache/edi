'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">

        <div className="mb-10 text-center">
          <span className="text-3xl font-bold tracking-tight text-white">EDI</span>
          <p className="mt-2 text-white/40 text-sm">rassegna stampa internazionale</p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="text-4xl mb-4">✉️</div>
            <h2 className="text-white font-semibold text-lg mb-2">Controlla la tua email</h2>
            <p className="text-white/40 text-sm leading-relaxed">
              Ti abbiamo inviato un link di accesso a<br />
              <span className="text-white/70">{email}</span>
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="mt-8 text-white/30 text-sm hover:text-white/60 transition-colors"
            >
              ← Usa un'altra email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <h1 className="text-white font-bold text-2xl mb-1">Accedi</h1>
              <p className="text-white/40 text-sm">Riceverai un link via email, senza password.</p>
            </div>

            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="la-tua@email.com"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
            />

            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className={`w-full py-4 rounded-2xl font-semibold text-base transition-all duration-150 ${
                loading || !email
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-red-500 text-white hover:bg-red-400 active:scale-[0.98]'
              }`}
            >
              {loading ? 'Invio in corso…' : 'Invia link →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
