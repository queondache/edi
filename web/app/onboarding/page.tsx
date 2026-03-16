'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Region, Topic, OnboardingState } from '@/lib/types'
import { suggestNewspapers, ALL_NEWSPAPERS } from '@/lib/newspapers-data'
import { createClient } from '@/lib/supabase-browser'

// ─── Step 1: Regioni ──────────────────────────────────────────────────────────

const REGIONS: { value: Region; label: string; emoji: string }[] = [
  { value: 'europa', label: 'Europa', emoji: '🇪🇺' },
  { value: 'america-latina', label: 'America Latina', emoji: '🌎' },
  { value: 'uk-us', label: 'USA / UK', emoji: '🇺🇸' },
  { value: 'medio-oriente', label: 'Medio Oriente', emoji: '🌍' },
  { value: 'africa', label: 'Africa', emoji: '🌍' },
  { value: 'asia', label: 'Asia', emoji: '🌏' },
]

// ─── Step 2: Temi ─────────────────────────────────────────────────────────────

const TOPICS: { value: Topic; label: string }[] = [
  { value: 'politica', label: 'Politica' },
  { value: 'geopolitica', label: 'Geopolitica' },
  { value: 'diritti', label: 'Diritti umani' },
  { value: 'clima', label: 'Clima / Ambiente' },
  { value: 'economia', label: 'Economia' },
  { value: 'lavoro', label: 'Lavoro' },
  { value: 'cultura', label: 'Cultura' },
  { value: 'conflitti', label: 'Conflitti' },
  { value: 'migrazioni', label: 'Migrazioni' },
]

// ─── Components ───────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5 mb-8">
      {[1, 2, 3, 4].map(s => (
        <div
          key={s}
          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
            s <= step ? 'bg-red-500' : 'bg-white/10'
          }`}
        />
      ))}
    </div>
  )
}

function SelectChip({
  label, selected, onClick, emoji
}: { label: string; selected: boolean; onClick: () => void; emoji?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 text-left flex items-center gap-2 ${
        selected
          ? 'bg-red-500 text-white'
          : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      {emoji && <span>{emoji}</span>}
      {label}
    </button>
  )
}

function ContinueButton({ onClick, disabled = false, label = 'Continua →' }: {
  onClick: () => void; disabled?: boolean; label?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-4 rounded-2xl font-semibold text-base transition-all duration-150 ${
        disabled
          ? 'bg-white/10 text-white/30 cursor-not-allowed'
          : 'bg-red-500 text-white hover:bg-red-400 active:scale-[0.98]'
      }`}
    >
      {label}
    </button>
  )
}

// ─── Onboarding Page ──────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [state, setState] = useState<OnboardingState>({
    regions: [],
    topics: [],
    politicalPosition: 2,
    selectedNewspaperSlugs: [],
  })

  useEffect(() => {
    const saved = localStorage.getItem('edi_profile')
    if (saved) {
      try {
        const profile = JSON.parse(saved) as OnboardingState
        setState(profile)
        setIsEditing(true)
      } catch {}
    }
  }, [])

  const suggested = step === 4
    ? suggestNewspapers(state.regions, state.topics, state.politicalPosition)
    : []

  function toggleRegion(r: Region) {
    setState(s => ({
      ...s,
      regions: s.regions.includes(r) ? s.regions.filter(x => x !== r) : [...s.regions, r]
    }))
  }

  function toggleTopic(t: Topic) {
    setState(s => ({
      ...s,
      topics: s.topics.includes(t) ? s.topics.filter(x => x !== t) : [...s.topics, t]
    }))
  }

  function toggleNewspaper(slug: string) {
    setState(s => ({
      ...s,
      selectedNewspaperSlugs: s.selectedNewspaperSlugs.includes(slug)
        ? s.selectedNewspaperSlugs.filter(x => x !== slug)
        : [...s.selectedNewspaperSlugs, slug]
    }))
  }

  function goToStep4() {
    const slugs = suggestNewspapers(state.regions, state.topics, state.politicalPosition)
      .map(n => n.slug)
    setState(s => ({ ...s, selectedNewspaperSlugs: slugs }))
    setStep(4)
  }

  async function finish() {
    setSaving(true)

    // Always save to localStorage
    localStorage.setItem('edi_onboarding_done', '1')
    localStorage.setItem('edi_profile', JSON.stringify(state))

    // Sync to Supabase if logged in
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Upsert user_profiles
        await supabase.from('user_profiles').upsert({
          id: user.id,
          regions: state.regions,
          topics: state.topics,
          political_position: state.politicalPosition,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })

        // Get newspaper UUIDs by slug
        const { data: newspapers } = await supabase
          .from('newspapers')
          .select('id, slug')
          .in('slug', state.selectedNewspaperSlugs)

        if (newspapers && newspapers.length > 0) {
          // Delete old selections
          await supabase.from('user_newspapers').delete().eq('user_id', user.id)

          // Insert new selections
          await supabase.from('user_newspapers').insert(
            newspapers.map(np => ({ user_id: user.id, newspaper_id: np.id }))
          )
        }
      }
    } catch (err) {
      console.error('Supabase sync error:', err)
      // Non-blocking: localStorage is already saved
    }

    setSaving(false)
    router.push('/home')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-5 py-8">

        {/* Logo */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold tracking-tight text-white">EDI</span>
            <span className="ml-2 text-sm text-white/40">rassegna stampa</span>
          </div>
          {isEditing && (
            <button
              onClick={() => router.push('/home')}
              className="text-white/30 text-sm hover:text-white/60 transition-colors"
            >
              ✕ Annulla
            </button>
          )}
        </div>

        <ProgressBar step={step} />

        {/* ── Step 1: Regioni ── */}
        {step === 1 && (
          <div className="flex flex-col flex-1">
            <h1 className="text-2xl font-bold text-white mb-2">
              {isEditing ? 'Modifica le tue regioni' : 'Quali aree del mondo ti interessano?'}
            </h1>
            <p className="text-white/40 text-sm mb-8">Scegli una o più regioni</p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {REGIONS.map(r => (
                <SelectChip
                  key={r.value}
                  label={r.label}
                  emoji={r.emoji}
                  selected={state.regions.includes(r.value)}
                  onClick={() => toggleRegion(r.value)}
                />
              ))}
            </div>

            <div className="mt-auto">
              <ContinueButton
                onClick={() => setStep(2)}
                disabled={state.regions.length === 0}
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Temi ── */}
        {step === 2 && (
          <div className="flex flex-col flex-1">
            <h1 className="text-2xl font-bold text-white mb-2">
              Cosa ti interessa?
            </h1>
            <p className="text-white/40 text-sm mb-8">Scegli uno o più temi</p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {TOPICS.map(t => (
                <SelectChip
                  key={t.value}
                  label={t.label}
                  selected={state.topics.includes(t.value)}
                  onClick={() => toggleTopic(t.value)}
                />
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-3">
              <ContinueButton
                onClick={() => setStep(3)}
                disabled={state.topics.length === 0}
              />
              <button
                onClick={() => setStep(1)}
                className="text-white/30 text-sm text-center hover:text-white/60 transition-colors"
              >
                ← Indietro
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Orientamento slider ── */}
        {step === 3 && (
          <div className="flex flex-col flex-1">
            <h1 className="text-2xl font-bold text-white mb-2">
              Il tuo orientamento
            </h1>
            <p className="text-white/40 text-sm mb-12">
              Seleziona dove ti posizioni per personalizzare i suggerimenti
            </p>

            <div className="mb-12">
              {/* Slider */}
              <div className="relative mb-4">
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={state.politicalPosition}
                  onChange={e => setState(s => ({ ...s, politicalPosition: Number(e.target.value) }))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right,
                      #ef4444 0%,
                      #ef4444 ${((state.politicalPosition - 1) / 4) * 100}%,
                      rgba(255,255,255,0.1) ${((state.politicalPosition - 1) / 4) * 100}%,
                      rgba(255,255,255,0.1) 100%
                    )`
                  }}
                />
                <style>{`
                  input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: ${state.politicalPosition <= 2 ? '#ef4444' : state.politicalPosition >= 4 ? '#1a1a1a' : '#888'};
                    border: 3px solid white;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                    transition: background 0.2s;
                  }
                `}</style>
              </div>

              {/* Labels */}
              <div className="flex justify-between">
                <span className="text-red-400 text-sm font-medium">Progressista</span>
                <span className="text-white/40 text-sm font-medium">Conservatore</span>
              </div>
            </div>

            {/* Tick indicator */}
            <div className="flex justify-center mb-12">
              <div className="flex gap-2">
                {[1,2,3,4,5].map(v => (
                  <div
                    key={v}
                    className={`w-2 h-2 rounded-full transition-all duration-150 ${
                      v === state.politicalPosition ? 'bg-white scale-125' : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-3">
              <ContinueButton onClick={goToStep4} />
              <button
                onClick={() => setStep(2)}
                className="text-white/30 text-sm text-center hover:text-white/60 transition-colors"
              >
                ← Indietro
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Testate suggerite ── */}
        {step === 4 && (
          <div className="flex flex-col flex-1">
            <h1 className="text-2xl font-bold text-white mb-2">
              Ecco le testate che ti suggeriamo
            </h1>
            <p className="text-white/40 text-sm mb-6">
              Aggiungi o rimuovi liberamente prima di confermare
            </p>

            <div className="flex-1 overflow-y-auto -mx-5 px-5 mb-6">
              {/* Suggerite */}
              <div className="space-y-2 mb-6">
                {suggested.map(n => {
                  const selected = state.selectedNewspaperSlugs.includes(n.slug)
                  return (
                    <button
                      key={n.slug}
                      onClick={() => toggleNewspaper(n.slug)}
                      className={`w-full flex items-start gap-3 p-4 rounded-xl transition-all duration-150 text-left ${
                        selected ? 'bg-white/10 border border-white/20' : 'bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        selected ? 'border-red-500 bg-red-500' : 'border-white/30'
                      }`}>
                        {selected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-white font-medium text-sm">{n.name}</span>
                          <span className="text-white/30 text-xs">{n.country}</span>
                        </div>
                        <p className="text-white/40 text-xs leading-relaxed line-clamp-2">{n.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Altre testate (non suggerite) */}
              {(() => {
                const otherNps = ALL_NEWSPAPERS.filter(
                  n => n.active && !suggested.some(s => s.slug === n.slug)
                )
                if (otherNps.length === 0) return null
                return (
                  <div>
                    <p className="text-white/30 text-xs uppercase tracking-wider mb-3 font-medium">Altre testate</p>
                    <div className="space-y-2">
                      {otherNps.map(n => {
                        const selected = state.selectedNewspaperSlugs.includes(n.slug)
                        return (
                          <button
                            key={n.slug}
                            onClick={() => toggleNewspaper(n.slug)}
                            className={`w-full flex items-start gap-3 p-4 rounded-xl transition-all duration-150 text-left ${
                              selected ? 'bg-white/10 border border-white/20' : 'bg-white/5 border border-transparent'
                            }`}
                          >
                            <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              selected ? 'border-red-500 bg-red-500' : 'border-white/30'
                            }`}>
                              {selected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-white font-medium text-sm">{n.name}</span>
                                <span className="text-white/30 text-xs">{n.country}</span>
                              </div>
                              <p className="text-white/40 text-xs leading-relaxed line-clamp-2">{n.description}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>

            <div className="flex flex-col gap-3">
              <ContinueButton
                onClick={finish}
                disabled={state.selectedNewspaperSlugs.length === 0 || saving}
                label={saving
                  ? 'Salvataggio…'
                  : isEditing
                  ? `Salva — ${state.selectedNewspaperSlugs.length} testate selezionate`
                  : `Inizia con ${state.selectedNewspaperSlugs.length} testate →`
                }
              />
              <button
                onClick={() => setStep(3)}
                className="text-white/30 text-sm text-center hover:text-white/60 transition-colors"
              >
                ← Indietro
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
