import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import {
  scrape,
  generateRecap,
  generateBriefFromDb,
  saveToSupabase,
  RecapResult,
  PipelineNewspaper,
} from '@/lib/pipeline-lib'

export const maxDuration = 60

// ─── Batch definitions ────────────────────────────────────────────────────────
// 31 testate attive suddivise in 4 gruppi da ~8, scaglionati ogni 5 min.
// Il batch 4 genera anche il brief del giorno dai recap già in DB.

const BATCHES: Record<string, string[]> = {
  '1': ['il-manifesto', 'fanpage', 'domani', 'eldiario', 'publico', 'el-salto', 'la-jornada', 'telesur'],
  '2': ['revista-anfibia', 'ciper-chile', 'pie-de-pagina', 'brasil-de-fato', 'plaza-publica', 'liberation', 'le-monde-diplomatique', 'the-guardian'],
  '3': ['al-jazeera', 'the-independent', 'the-intercept', 'jacobin', '972-magazine', 'middle-east-eye', 'mondoweiss', 'daily-maverick'],
  '4': ['mail-guardian', 'the-wire', 'the-diplomat', 'scmp', 'taz', 'mediapart', 'balkan-insight'],
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batch: string }> }
) {
  // Vercel invia automaticamente: Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let batch: string
  try {
    batch = (await params).batch
  } catch (e) {
    return NextResponse.json({ error: 'params error', detail: String(e) }, { status: 500 })
  }

  const slugs = BATCHES[batch]
  if (!slugs) {
    return NextResponse.json({ error: `Batch "${batch}" non esiste` }, { status: 400 })
  }

  const geminiKey = process.env.GEMINI_API_KEY ?? ''
  const date = new Date().toISOString().split('T')[0]

  // Carica le testate del batch da Supabase
  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (e) {
    return NextResponse.json({ error: 'createAdminClient failed', detail: String(e) }, { status: 500 })
  }

  const { data: newspapers, error } = await admin
    .from('newspapers')
    .select('*')
    .in('slug', slugs)
    .eq('active', true)

  if (error || !newspapers) {
    return NextResponse.json({ error: 'Failed to load newspapers' }, { status: 500 })
  }

  // Mantieni l'ordine del batch (Supabase non garantisce l'ordine di IN)
  const ordered = slugs
    .map(s => (newspapers as PipelineNewspaper[]).find(n => n.slug === s))
    .filter(Boolean) as PipelineNewspaper[]

  const results: { slug: string; status: 'ok' | 'error'; error?: string }[] = []
  const recapResults: RecapResult[] = []

  for (const np of ordered) {
    try {
      const { items } = await scrape(np)
      if (items.length === 0) {
        results.push({ slug: np.slug, status: 'error', error: 'No items' })
        continue
      }
      const recap = await generateRecap(np, items, geminiKey)
      recapResults.push({ newspaper: np, items, recap })
      results.push({ slug: np.slug, status: 'ok' })
    } catch (err) {
      results.push({ slug: np.slug, status: 'error', error: err instanceof Error ? err.message : String(err) })
    }
  }

  // Salva recap del batch
  const successful = recapResults.filter(r => 'headlines' in r.recap)
  const { saveErrors } = await saveToSupabase(successful, null, date)

  // Batch 4: genera il brief dai recap di tutti i batch già in DB
  let brief: string | null = null
  if (batch === '4') {
    brief = await generateBriefFromDb(date, geminiKey).catch(() => null)
    if (brief) {
      const adminClient = createAdminClient()
      await adminClient.from('daily_briefs').upsert(
        { date, brief_text: brief, generated_at: new Date().toISOString() },
        { onConflict: 'date' }
      )
    }
  }

  return NextResponse.json({
    batch,
    date,
    ok: results.filter(r => r.status === 'ok').length,
    errors: results.filter(r => r.status === 'error').length,
    saveErrors,
    ...(batch === '4' ? { brief: brief ? brief.slice(0, 100) + '…' : null } : {}),
    results,
  })
}
