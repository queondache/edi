import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─── Prezzi Gemini 2.5 Flash (USD per 1M token, marzo 2026) ─────────────────
const PRICE_INPUT_PER_M = 0.30   // $0.30 / 1M input tokens
const PRICE_OUTPUT_PER_M = 2.50  // $2.50 / 1M output tokens
const USD_TO_EUR = 0.92          // Tasso approssimativo, aggiornabile

function tokensToEur(promptTokens: number, completionTokens: number): number {
  const inputCost = (promptTokens / 1_000_000) * PRICE_INPUT_PER_M
  const outputCost = (completionTokens / 1_000_000) * PRICE_OUTPUT_PER_M
  return (inputCost + outputCost) * USD_TO_EUR
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const dateParam = request.nextUrl.searchParams.get('date')
  const date = dateParam || new Date().toISOString().split('T')[0]

  // Slugs dell'utente (passati come query param, letti dal localStorage client-side)
  const slugsParam = request.nextUrl.searchParams.get('slugs')
  const userSlugs = slugsParam ? slugsParam.split(',').map(s => s.trim()).filter(Boolean) : []

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const admin = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Tutti i costi della pipeline per la data
  const { data: costs, error: costsError } = await admin
    .from('pipeline_costs')
    .select('newspaper_id, cost_type, prompt_tokens, completion_tokens, total_tokens')
    .eq('date', date)

  if (costsError) {
    return NextResponse.json({ error: costsError.message }, { status: 500 })
  }

  if (!costs || costs.length === 0) {
    return NextResponse.json({
      date,
      totalCostEur: 0,
      userCostEur: 0,
      totalReaders: 0,
      breakdown: [],
      brief: null,
    })
  }

  // 2. Per ogni testata con costo recap, conta quanti utenti la seguono
  const newspaperIds = costs
    .filter(c => c.cost_type === 'recap' && c.newspaper_id)
    .map(c => c.newspaper_id as string)

  // Conta follower per testata
  const { data: followerCounts } = await admin
    .from('user_newspapers')
    .select('newspaper_id')
    .in('newspaper_id', newspaperIds.length > 0 ? newspaperIds : ['__none__'])

  const followersMap = new Map<string, number>()
  if (followerCounts) {
    for (const row of followerCounts) {
      followersMap.set(row.newspaper_id, (followersMap.get(row.newspaper_id) ?? 0) + 1)
    }
  }

  // 3. Conta utenti attivi totali (per split del brief)
  const { count: totalUsers } = await admin
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('onboarding_completed', true)

  const activeUsers = totalUsers ?? 1

  // 4. Mappa newspaper_id → slug (serve per il matching con le selezioni utente)
  const { data: newspaperRows } = await admin
    .from('newspapers')
    .select('id, slug, name')
    .in('id', newspaperIds.length > 0 ? newspaperIds : ['00000000-0000-0000-0000-000000000000'])

  const npMap = new Map<string, { slug: string; name: string }>()
  if (newspaperRows) {
    for (const np of newspaperRows) {
      npMap.set(np.id, { slug: np.slug, name: np.name })
    }
  }

  // 5. Calcola costi
  let totalCostEur = 0
  let userCostEur = 0
  const breakdown: {
    slug: string
    name: string
    costEur: number
    followers: number
    userShareEur: number
  }[] = []

  for (const cost of costs) {
    const costEur = tokensToEur(cost.prompt_tokens, cost.completion_tokens)
    totalCostEur += costEur

    if (cost.cost_type === 'recap' && cost.newspaper_id) {
      const np = npMap.get(cost.newspaper_id)
      if (!np) continue

      const followers = followersMap.get(cost.newspaper_id) ?? 1
      const isUserFollowing = userSlugs.includes(np.slug)
      const userShare = isUserFollowing ? costEur / Math.max(followers, 1) : 0

      if (isUserFollowing) {
        userCostEur += userShare
      }

      breakdown.push({
        slug: np.slug,
        name: np.name,
        costEur,
        followers,
        userShareEur: userShare,
      })
    }
  }

  // Brief cost split across all active users
  const briefCost = costs.find(c => c.cost_type === 'brief')
  let briefInfo = null
  if (briefCost) {
    const briefEur = tokensToEur(briefCost.prompt_tokens, briefCost.completion_tokens)
    // totalCostEur already includes brief (accumulated in the loop above)
    const briefUserShare = briefEur / Math.max(activeUsers, 1)
    userCostEur += briefUserShare
    briefInfo = {
      costEur: briefEur,
      activeUsers,
      userShareEur: briefUserShare,
    }
  }

  return NextResponse.json({
    date,
    totalCostEur: Math.round(totalCostEur * 1_000_000) / 1_000_000,
    userCostEur: Math.round(userCostEur * 1_000_000) / 1_000_000,
    totalReaders: activeUsers,
    breakdown: breakdown.sort((a, b) => b.userShareEur - a.userShareEur),
    brief: briefInfo,
  })
}
