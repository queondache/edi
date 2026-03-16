'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BRIEF_CONTRIBUTIONS, MOCK_RECAPS } from '@/lib/mock-data'
import { ALL_NEWSPAPERS } from '@/lib/newspapers-data'
import { DailyRecap, Newspaper, Headline } from '@/lib/types'
import { createClient } from '@/lib/supabase-browser'

const TOPIC_COLORS: Record<string, string> = {
  conflitti: 'bg-red-950 text-red-400',
  geopolitica: 'bg-orange-950 text-orange-400',
  politica: 'bg-blue-950 text-blue-400',
  diritti: 'bg-purple-950 text-purple-400',
  economia: 'bg-green-950 text-green-400',
  società: 'bg-zinc-800 text-zinc-400',
  cultura: 'bg-yellow-950 text-yellow-400',
  clima: 'bg-emerald-950 text-emerald-400',
  lavoro: 'bg-cyan-950 text-cyan-400',
  migrazioni: 'bg-indigo-950 text-indigo-400',
}

function TopicTag({ topic }: { topic: string }) {
  const cls = TOPIC_COLORS[topic] ?? 'bg-zinc-800 text-zinc-400'
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${cls}`}>
      {topic}
    </span>
  )
}

function NewspaperInfo({ newspaper }: { newspaper: Newspaper }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        className="text-white/20 hover:text-white/60 transition-colors flex-shrink-0"
        aria-label="Info testata"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6.5" stroke="currentColor"/>
          <path d="M7 6.5V10M7 4.5V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Modal */}
          <div
            className="relative bg-[#111] border border-white/10 rounded-2xl p-5 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-white font-semibold text-base leading-tight">{newspaper.name}</p>
                <p className="text-white/40 text-xs mt-0.5">{newspaper.country}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/30 hover:text-white/70 transition-colors mt-0.5 flex-shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">{newspaper.description}</p>
          </div>
        </div>
      )}
    </>
  )
}

function formatDate(pubDate?: string): string | null {
  if (!pubDate) return null
  const d = new Date(pubDate)
  if (isNaN(d.getTime())) return null

  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = diffMs / (1000 * 60 * 60)

  if (diffH < 24 && d.getDate() === now.getDate()) {
    const h = Math.floor(diffH)
    if (h < 1) return 'Poco fa'
    return `${h} ${h === 1 ? 'ora' : 'ore'} fa`
  }

  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

function BriefCard({ text }: { text: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/30">Brief del giorno</span>
        <span className="text-xs text-white/20">·</span>
        <span className="text-xs text-white/20">
          {new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
        </span>
      </div>
      <p className="text-white/80 text-[15px] leading-relaxed">{text}</p>
    </div>
  )
}

function NewspaperPlaceholder({ newspaper }: { newspaper: Newspaper }) {
  return (
    <div className="mb-5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-base">{newspaper.name}</span>
          <span className="text-white/30 text-xs">{newspaper.country}</span>
          <NewspaperInfo newspaper={newspaper} />
        </div>
      </div>
      <div className="px-4 pb-5 flex items-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/60 shrink-0" />
        <p className="text-white/30 text-sm">Recap in arrivo domani mattina</p>
      </div>
    </div>
  )
}

function NewspaperRecap({ recap }: { recap: DailyRecap }) {
  const [open, setOpen] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const { newspaper, headlines } = recap
  const visible = expanded ? headlines : headlines.slice(0, 5)

  return (
    <div className="mb-5 border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-base">{newspaper.name}</span>
          <span className="text-white/30 text-xs">{newspaper.country}</span>
          <NewspaperInfo newspaper={newspaper} />
        </div>
        <svg
          className={`w-4 h-4 text-white/30 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Headlines */}
      {open && (
        <>
          <div className="divide-y divide-white/5">
            {visible.map((h, i) => (
              <a
                key={i}
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-4 hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-white/20 text-xs font-mono mt-0.5 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="mb-1.5">
                      <TopicTag topic={h.topic} />
                    </div>
                    <p className="text-white text-sm font-medium leading-snug mb-1 group-hover:text-white/80 transition-colors">
                      {h.title}
                    </p>
                    <p className="text-white/40 text-xs leading-relaxed">{h.summary}</p>
                    {formatDate(h.pubDate) && (
                      <p className="text-white/20 text-xs mt-1">{formatDate(h.pubDate)}</p>
                    )}
                  </div>
                  <svg className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 shrink-0 mt-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </a>
            ))}
          </div>

          {headlines.length > 5 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="w-full py-3 text-xs text-white/30 hover:text-white/60 transition-colors border-t border-white/5"
            >
              {expanded ? '↑ Mostra meno' : `↓ Mostra altri ${headlines.length - 5} articoli`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─── DB data loading ──────────────────────────────────────────────────────────

interface DbRecapRow {
  newspaper_id: string
  date: string
  headlines: Headline[]
  newspapers: {
    slug: string
    name: string
    country: string
    region: string
    language: string
    orientation: string
    frequency: string
    description: string
    url: string
    rss_url: string | null
    scrape_method: 'rss' | 'jina'
    topics: string[]
    active: boolean
  }
}

async function loadFromDB(selectedSlugs: string[]): Promise<{
  recapMap: Map<string, DailyRecap>
  briefText: string | null
}> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const [recapsRes, briefRes] = await Promise.all([
    supabase
      .from('daily_recaps')
      .select('newspaper_id, date, headlines, newspapers(*)')
      .eq('date', today),
    supabase
      .from('daily_briefs')
      .select('brief_text')
      .eq('date', today)
      .maybeSingle(),
  ])

  const recapMap = new Map<string, DailyRecap>()

  if (recapsRes.data) {
    for (const row of recapsRes.data as unknown as DbRecapRow[]) {
      const np = row.newspapers
      if (!np) continue
      recapMap.set(np.slug, {
        newspaper: {
          id: row.newspaper_id,
          slug: np.slug,
          name: np.name,
          country: np.country,
          region: np.region as Newspaper['region'],
          language: np.language,
          orientation: np.orientation,
          frequency: np.frequency,
          description: np.description,
          url: np.url,
          rss_url: np.rss_url,
          scrape_method: np.scrape_method,
          topics: np.topics,
          active: np.active,
        },
        headlines: (row.headlines ?? []) as Headline[],
      })
    }
  }

  const briefText = briefRes.data?.brief_text ?? null
  return { recapMap, briefText }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter()
  const [items, setItems] = useState<{ newspaper: Newspaper; recap: DailyRecap | null }[]>([])
  const [briefText, setBriefText] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const done = localStorage.getItem('edi_onboarding_done')
    if (!done) { router.replace('/onboarding'); return }

    const profile = JSON.parse(localStorage.getItem('edi_profile') || '{}')
    const selectedSlugs: string[] = profile.selectedNewspaperSlugs ?? []

    const selectedNewspapers = selectedSlugs.length > 0
      ? ALL_NEWSPAPERS.filter(n => selectedSlugs.includes(n.slug))
      : ALL_NEWSPAPERS.filter(n => n.active)

    // Try DB first, fall back to mock data
    loadFromDB(selectedSlugs).then(({ recapMap, briefText: dbBrief }) => {
      const hasDbData = recapMap.size > 0

      // Prefer DB recaps; fall back to MOCK_RECAPS for newspapers not yet in DB
      const mockMap = new Map(MOCK_RECAPS.map(r => [r.newspaper.slug, r]))
      const merged = new Map([...mockMap, ...recapMap])

      setItems(selectedNewspapers.map(np => ({
        newspaper: np,
        recap: merged.get(np.slug) ?? null,
      })))

      if (dbBrief) {
        setBriefText(dbBrief)
      } else if (hasDbData) {
        // Build brief from DB recaps for user's selected newspapers
        const contributions = selectedNewspapers
          .filter(np => recapMap.has(np.slug))
          .map(np => BRIEF_CONTRIBUTIONS[np.slug])
          .filter(Boolean)
        setBriefText(contributions.join(' '))
      } else {
        // Fall back to mock brief built from BRIEF_CONTRIBUTIONS
        const contributions = selectedNewspapers
          .map(np => BRIEF_CONTRIBUTIONS[np.slug])
          .filter(Boolean)
        setBriefText(contributions.join(' '))
      }

      setLoading(false)
    }).catch(() => {
      // DB unavailable — use mock data
      const mockMap = new Map(MOCK_RECAPS.map(r => [r.newspaper.slug, r]))
      setItems(selectedNewspapers.map(np => ({
        newspaper: np,
        recap: mockMap.get(np.slug) ?? null,
      })))
      const contributions = selectedNewspapers
        .map(np => BRIEF_CONTRIBUTIONS[np.slug])
        .filter(Boolean)
      setBriefText(contributions.join(' '))
      setLoading(false)
    })
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white/20 text-sm">Caricamento…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-md mx-auto px-5 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-2xl font-bold tracking-tight text-white">EDI</span>
            <span className="ml-2 text-sm text-white/40">rassegna stampa</span>
          </div>
          <button
            onClick={() => router.push('/onboarding')}
            className="text-white/30 text-xs hover:text-white/60 transition-colors"
          >
            ⚙ Preferenze
          </button>
        </div>

        {/* Brief del giorno */}
        {briefText && <BriefCard text={briefText} />}

        {/* Recap testate */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">
            Le tue testate
          </h2>
          {items.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-12">
              Nessuna testata selezionata.{' '}
              <button onClick={() => router.push('/onboarding')} className="text-red-400 underline">Configura preferenze</button>
            </p>
          ) : (
            items.map(({ newspaper, recap }) =>
              recap
                ? <NewspaperRecap key={newspaper.slug} recap={recap} />
                : <NewspaperPlaceholder key={newspaper.slug} newspaper={newspaper} />
            )
          )}
        </div>

      </div>
    </div>
  )
}
