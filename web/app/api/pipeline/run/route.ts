import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import {
  scrape,
  generateRecap,
  generateBrief,
  saveToSupabase,
  RecapResult,
  PipelineNewspaper,
} from '@/lib/pipeline-lib'

// Protect with a secret to avoid accidental public triggering
const PIPELINE_SECRET = process.env.PIPELINE_SECRET

export async function POST(request: NextRequest) {
  // Auth check
  if (PIPELINE_SECRET) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${PIPELINE_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY ?? ''
  const date = new Date().toISOString().split('T')[0]
  const idsParam = new URL(request.url).searchParams.get('ids')
  const filterIds = idsParam ? idsParam.split(',').map(s => s.trim()) : null

  // Load active newspapers from Supabase
  const admin = createAdminClient()
  let query = admin.from('newspapers').select('*').eq('active', true)
  if (filterIds) query = query.in('slug', filterIds)
  const { data: newspapers, error: npError } = await query

  if (npError || !newspapers) {
    return NextResponse.json({ error: 'Failed to load newspapers', detail: npError?.message }, { status: 500 })
  }

  const results: {
    slug: string
    name: string
    status: 'ok' | 'error'
    headlines?: number
    error?: string
  }[] = []

  const recapResults: RecapResult[] = []

  for (const np of newspapers as PipelineNewspaper[]) {
    try {
      const { items } = await scrape(np)
      if (items.length === 0) {
        results.push({ slug: np.slug, name: np.name, status: 'error', error: 'No items found' })
        continue
      }

      const recap = await generateRecap(np, items, geminiKey)
      recapResults.push({ newspaper: np, items, recap })

      const headlineCount = 'headlines' in recap ? recap.headlines.length : 0
      results.push({ slug: np.slug, name: np.name, status: 'ok', headlines: headlineCount })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ slug: np.slug, name: np.name, status: 'error', error: msg })
    }
  }

  // Generate brief
  const successfulRecaps = recapResults.filter(r => 'headlines' in r.recap)
  const briefText = await generateBrief(successfulRecaps, geminiKey).catch(() => null)

  // Save everything to Supabase
  await saveToSupabase(successfulRecaps, briefText, date)

  return NextResponse.json({
    date,
    brief: briefText ? briefText.slice(0, 120) + '…' : null,
    processed: results.length,
    ok: results.filter(r => r.status === 'ok').length,
    errors: results.filter(r => r.status === 'error').length,
    results,
  })
}
