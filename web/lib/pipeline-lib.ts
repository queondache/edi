/**
 * EDI — Pipeline core logic (shared between API route and CLI script)
 * Server-side only (Node.js).
 */

import { parseString } from 'xml2js'
import { promisify } from 'util'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createAdminClient } from './supabase-server'

const parseXML = promisify(parseString)

// ─── Config ───────────────────────────────────────────────────────────────────

export const GEMINI_MODEL = 'gemini-2.5-flash'
const MAX_ITEMS_PER_FEED = 10
const JINA_TIMEOUT_MS = 25000
const RSS_TIMEOUT_MS = 10000

export interface PipelineNewspaper {
  id?: string
  slug: string
  name: string
  country: string
  region: string
  language: string
  orientation: string
  url: string
  rss_url?: string | null
  scrape_method: 'rss' | 'jina'
  topics?: string[]
}

export interface RawItem {
  title: string
  url: string
  summary: string
  pubDate: string
}

export interface Headline {
  title: string
  summary: string
  url: string
  topic: string
}

export interface RecapResult {
  newspaper: PipelineNewspaper
  items: RawItem[]
  recap: { headlines: Headline[] } | { dry_run: true; raw_items: RawItem[] }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function cleanText(text: string): string {
  return text
    .replace(/&#\d+;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function isJunkTitle(title: string): boolean {
  return /^(menu|login|subscribe|home|about|contact|newsletter|cookie|privacy|search|share|tweet|facebook|instagram|seguici|accedi|abbonati|registrati|leggi|seguire|edizione|imagen|image|\!\[|donate|support|non-profit|reader-funded)/i.test(title)
    || title.length < 25
    || /^\d+$/.test(title)
    || title.startsWith('![')
}

// ─── RSS Scraper ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchRSS(url: string): Promise<RawItem[]> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; EDI/1.0; +https://edi.news)',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    },
    signal: AbortSignal.timeout(RSS_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const xml = await res.text()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = await parseXML(xml) as any

  if (parsed?.rss?.channel?.[0]?.item) {
    return parsed.rss.channel[0].item.slice(0, MAX_ITEMS_PER_FEED).map((item: any) => ({
      title: decodeEntities(item.title?.[0] || ''),
      url: item.link?.[0] || item.guid?.[0]?._ || item.guid?.[0] || '',
      summary: stripHtml(item.description?.[0] || item['content:encoded']?.[0] || '').slice(0, 300),
      pubDate: item.pubDate?.[0] || '',
    }))
  }

  if (parsed?.feed?.entry) {
    return parsed.feed.entry.slice(0, MAX_ITEMS_PER_FEED).map((entry: any) => ({
      title: decodeEntities(entry.title?.[0]?._ || entry.title?.[0] || ''),
      url: entry.link?.[0]?.$.href || entry.link?.[0] || '',
      summary: stripHtml(entry.summary?.[0]?._ || entry.summary?.[0] || entry.content?.[0]?._ || '').slice(0, 300),
      pubDate: entry.published?.[0] || entry.updated?.[0] || '',
    }))
  }

  throw new Error('Nessun item trovato nel feed')
}

// ─── Jina Scraper ─────────────────────────────────────────────────────────────

export async function fetchJina(homepageUrl: string): Promise<RawItem[]> {
  const jinaUrl = `https://r.jina.ai/${homepageUrl}`
  const res = await fetch(jinaUrl, {
    headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown' },
    signal: AbortSignal.timeout(JINA_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const markdown = await res.text()
  return extractItemsFromMarkdown(markdown, homepageUrl)
}

function extractItemsFromMarkdown(markdown: string, baseUrl: string): RawItem[] {
  const lines = markdown.split('\n')
  const items: RawItem[] = []
  const seenTitles = new Set<string>()
  const linkRe = /\[([^\]]{25,200})\]\((https?:\/\/[^\)]+)\)/g

  for (const line of lines) {
    let match
    while ((match = linkRe.exec(line)) !== null) {
      const title = cleanText(match[1])
      const url = match[2]
      if (isJunkTitle(title)) continue
      if (seenTitles.has(title)) continue
      try {
        if (!url.includes(new URL(baseUrl).hostname)) continue
      } catch { continue }
      seenTitles.add(title)
      items.push({ title, url, summary: '', pubDate: '' })
      if (items.length >= MAX_ITEMS_PER_FEED) break
    }
    if (items.length >= MAX_ITEMS_PER_FEED) break
  }

  if (items.length < 3) {
    for (const line of lines) {
      const headingMatch = line.trim().match(/^#{1,3}\s+(.{30,200})$/)
      if (headingMatch) {
        const title = cleanText(headingMatch[1])
        if (!isJunkTitle(title) && !seenTitles.has(title)) {
          seenTitles.add(title)
          items.push({ title, url: baseUrl, summary: '', pubDate: '' })
          if (items.length >= MAX_ITEMS_PER_FEED) break
        }
      }
    }
  }

  return items
}

// ─── Scraper dispatcher ───────────────────────────────────────────────────────

export async function scrape(newspaper: PipelineNewspaper): Promise<{ method: string; items: RawItem[] }> {
  if (newspaper.scrape_method === 'rss' && newspaper.rss_url) {
    try {
      return { method: 'rss', items: await fetchRSS(newspaper.rss_url) }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Fallback to Jina on 403/401 (bot blocking)
      if (msg.includes('HTTP 403') || msg.includes('HTTP 401')) {
        return { method: 'jina-fallback', items: await fetchJina(newspaper.url) }
      }
      throw err
    }
  } else if (newspaper.scrape_method === 'jina') {
    return { method: 'jina', items: await fetchJina(newspaper.url) }
  }
  throw new Error('Nessun metodo di scraping configurato')
}

// ─── AI Recap ─────────────────────────────────────────────────────────────────

function buildRecapPrompt(newspaper: PipelineNewspaper, items: RawItem[]): string {
  const headlines = items.map((item, i) =>
    `${i + 1}. ${item.title}${item.summary ? `\n   Sintesi: ${item.summary}` : ''}\n   URL: ${item.url}`
  ).join('\n\n')

  return `Sei un editor di una rassegna stampa italiana. Analizza questi articoli da "${newspaper.name}" (${newspaper.country}, orientamento: ${newspaper.orientation}) e restituisci un JSON con questa struttura esatta:

{
  "headlines": [
    {
      "title": "Titolo tradotto in italiano",
      "summary": "Una riga di sintesi in italiano",
      "url": "url originale",
      "topic": "uno tra: politica|economia|geopolitica|diritti|clima|cultura|lavoro|società|conflitti|investigazione"
    }
  ]
}

Restituisci ESATTAMENTE 10 headline (o meno se gli articoli sono meno di 10). Traduci i titoli in italiano. Rispondi SOLO con il JSON, senza testo aggiuntivo.

Articoli di oggi:
${headlines}`
}

function buildBriefPrompt(recaps: RecapResult[]): string {
  const summaries = recaps.map(r => {
    const headlines = 'headlines' in r.recap
      ? r.recap.headlines.map((h: Headline) => `  - ${h.title} [${h.topic}]`).join('\n')
      : ''
    return `## ${r.newspaper.name} (${r.newspaper.country})\nHeadline:\n${headlines}`
  }).join('\n\n')

  return `Sei un editor senior di una rassegna stampa internazionale progressista. Hai ricevuto i recap delle seguenti testate di oggi:

${summaries}

Scrivi il "Brief del giorno": massimo 4 righe. Sii conciso e incisivo.
NON riassumere una singola testata. Il brief DEVE confrontare le coperture di TUTTE le testate selezionate, evidenziando cosa copre una e ignora l'altra. Esempio: "Il Manifesto apre sull'escalation in Libano, The Guardian si concentra sull'Africa, El Salto dà spazio alla Cisgiordania."
Usa un tono giornalistico, asciutto ma non freddo. Scrivi in italiano. Inizia direttamente con il contenuto, senza intestazioni.`
}

async function callGemini(model: ReturnType<InstanceType<typeof GoogleGenerativeAI>['getGenerativeModel']>, prompt: string): Promise<string> {
  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

function sanitizeJson(raw: string): string {
  const match = raw.match(/\{[\s\S]+\}/)
  if (!match) throw new Error('Risposta AI non è JSON valido')

  return match[0]
    // Remove control characters except tab (\x09), newline (\x0A), carriage return (\x0D)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Fix unescaped newlines/tabs inside JSON strings
    .replace(/"((?:[^"\\]|\\.)*)"/g, (_, inner: string) =>
      '"' + inner
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
      + '"'
    )
}

// Regex fallback: extract headline objects from raw Gemini text when JSON.parse fails
function extractHeadlinesFallback(raw: string): { headlines: Headline[] } | null {
  const headlines: Headline[] = []

  // Match each object block between { ... } inside the headlines array
  const blockRe = /\{[^{}]*"title"\s*:[^{}]*\}/g
  let block: RegExpExecArray | null
  while ((block = blockRe.exec(raw)) !== null) {
    try {
      // Try parsing this single block after light sanitize
      const cleaned = block[0]
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
      const obj = JSON.parse(cleaned)
      if (obj.title && obj.url && obj.topic) {
        headlines.push({
          title: String(obj.title),
          summary: String(obj.summary ?? ''),
          url: String(obj.url),
          topic: String(obj.topic),
        })
      }
    } catch {
      // Try field-by-field extraction with regex
      const blockStr = block![0]
      const get = (key: string) => {
        const m = blockStr.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*?)"`))
        return m ? m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"') : ''
      }
      const title = get('title')
      const url = get('url')
      const topic = get('topic')
      if (title && url && topic) {
        headlines.push({ title, summary: get('summary'), url, topic })
      }
    }
  }

  return headlines.length > 0 ? { headlines } : null
}

export async function generateRecap(
  newspaper: PipelineNewspaper,
  items: RawItem[],
  apiKey: string
): Promise<{ headlines: Headline[] } | { dry_run: true; raw_items: RawItem[] }> {
  if (!apiKey) return { dry_run: true, raw_items: items.slice(0, 5) }

  const genai = new GoogleGenerativeAI(apiKey)
  const model = genai.getGenerativeModel({ model: GEMINI_MODEL })
  const text = await callGemini(model, buildRecapPrompt(newspaper, items))

  try {
    return JSON.parse(sanitizeJson(text))
  } catch {
    const fallback = extractHeadlinesFallback(text)
    if (fallback) return fallback
    throw new Error('Risposta AI non parsabile (sanitize + fallback regex entrambi falliti)')
  }
}

export async function generateBrief(recaps: RecapResult[], apiKey: string): Promise<string | null> {
  if (!apiKey || recaps.length === 0) return null

  const genai = new GoogleGenerativeAI(apiKey)
  const model = genai.getGenerativeModel({ model: GEMINI_MODEL })
  return callGemini(model, buildBriefPrompt(recaps))
}

// ─── Brief from DB ────────────────────────────────────────────────────────────

// Genera il brief leggendo i recap già salvati oggi nel DB (usato dall'ultimo batch cron)
export async function generateBriefFromDb(date: string, apiKey: string): Promise<string | null> {
  if (!apiKey) return null
  const admin = createAdminClient()

  const { data: rows } = await admin
    .from('daily_recaps')
    .select('headlines, newspapers(name, country, orientation, slug)')
    .eq('date', date)

  if (!rows || rows.length === 0) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fakeRecaps: RecapResult[] = (rows as any[]).map(row => ({
    newspaper: {
      slug: row.newspapers.slug,
      name: row.newspapers.name,
      country: row.newspapers.country,
      orientation: row.newspapers.orientation,
    } as PipelineNewspaper,
    items: [],
    recap: { headlines: row.headlines ?? [] },
  }))

  return generateBrief(fakeRecaps, apiKey)
}

// ─── Supabase Save ────────────────────────────────────────────────────────────

export async function saveToSupabase(
  recaps: RecapResult[],
  briefText: string | null,
  date: string
): Promise<{ saveErrors: string[] }> {
  const admin = createAdminClient()
  const saveErrors: string[] = []

  // Upsert daily_recaps
  for (const r of recaps) {
    if ('dry_run' in r.recap) continue

    // Look up newspaper UUID by slug
    const { data: np, error: npError } = await admin
      .from('newspapers')
      .select('id')
      .eq('slug', r.newspaper.slug)
      .single()

    if (npError) {
      saveErrors.push(`lookup ${r.newspaper.slug}: ${npError.message}`)
      continue
    }

    if (!np) {
      saveErrors.push(`not found in DB: ${r.newspaper.slug}`)
      continue
    }

    const { error } = await admin.from('daily_recaps').upsert({
      newspaper_id: np.id,
      date,
      headlines: r.recap.headlines,
      generated_at: new Date().toISOString(),
    }, { onConflict: 'newspaper_id,date' })

    if (error) saveErrors.push(`upsert ${r.newspaper.slug}: ${error.message}`)
  }

  // Upsert daily_brief
  if (briefText) {
    const { error } = await admin.from('daily_briefs').upsert({
      date,
      brief_text: briefText,
      generated_at: new Date().toISOString(),
    }, { onConflict: 'date' })

    if (error) saveErrors.push(`upsert brief: ${error.message}`)
  }

  return { saveErrors }
}
