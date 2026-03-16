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

// Vercel automatically sends: Authorization: Bearer <CRON_SECRET>
export const maxDuration = 300 // 5 minutes — requires Vercel Pro

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const geminiKey = process.env.GEMINI_API_KEY ?? ''
  const date = new Date().toISOString().split('T')[0]

  const admin = createAdminClient()
  const { data: newspapers, error: npError } = await admin
    .from('newspapers')
    .select('*')
    .eq('active', true)

  if (npError || !newspapers) {
    return NextResponse.json({ error: 'Failed to load newspapers' }, { status: 500 })
  }

  const results: { slug: string; status: 'ok' | 'error'; error?: string }[] = []
  const recapResults: RecapResult[] = []

  for (const np of newspapers as PipelineNewspaper[]) {
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

  const successfulRecaps = recapResults.filter(r => 'headlines' in r.recap)
  const briefText = await generateBrief(successfulRecaps, geminiKey).catch(() => null)
  await saveToSupabase(successfulRecaps, briefText, date)

  return NextResponse.json({
    date,
    ok: results.filter(r => r.status === 'ok').length,
    errors: results.filter(r => r.status === 'error').length,
  })
}
