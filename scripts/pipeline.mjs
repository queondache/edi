/**
 * EDI — Pipeline scraping + recap AI + brief del giorno
 *
 * Usage:
 *   node --env-file=.env.local scripts/pipeline.mjs
 *   node --env-file=.env.local scripts/pipeline.mjs --ids=il-manifesto,the-guardian,el-salto
 *   node --env-file=.env.local scripts/pipeline.mjs --all
 *
 * Env (.env.local):
 *   GEMINI_API_KEY  — se assente, dry-run (mostra solo headline grezze)
 */

import { readFileSync, writeFileSync } from 'fs';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const parseXML = promisify(parseString);
const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ──────────────────────────────────────────────────────────────────

const NEWSPAPERS_PATH = resolve(__dirname, '../edi-newspapers.json');
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_ITEMS_PER_FEED = 10;
const JINA_TIMEOUT_MS = 25000;
const RSS_TIMEOUT_MS = 10000;
const GEMINI_MODEL = 'gemini-2.5-flash';

// Supabase admin client (optional — only if credentials are set)
const supabase = (SUPABASE_URL && SUPABASE_SERVICE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

const DEFAULT_TEST_IDS = ['il-manifesto', 'the-guardian', 'el-salto'];

// ─── Gemini client ────────────────────────────────────────────────────────────

const genai = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;

// ─── Parsing args ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const runAll = args.includes('--all');
const saveJson = args.includes('--save-json');
const idsArg = args.find(a => a.startsWith('--ids='));
const targetIds = runAll
  ? null
  : idsArg
  ? idsArg.replace('--ids=', '').split(',')
  : DEFAULT_TEST_IDS;

// ─── Load newspapers ─────────────────────────────────────────────────────────

const { newspapers } = JSON.parse(readFileSync(NEWSPAPERS_PATH, 'utf8'));
const active = newspapers.filter(n => n.active !== false);
const targets = targetIds ? active.filter(n => targetIds.includes(n.id)) : active;

// ─── RSS Scraper ──────────────────────────────────────────────────────────────

async function fetchRSS(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; EDI/1.0; +https://edi.news)',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    },
    signal: AbortSignal.timeout(RSS_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const parsed = await parseXML(xml);

  const channel = parsed?.rss?.channel?.[0] || parsed?.feed;
  if (!channel) throw new Error('Struttura XML non riconosciuta');

  // RSS 2.0
  if (parsed?.rss?.channel?.[0]?.item) {
    return parsed.rss.channel[0].item.slice(0, MAX_ITEMS_PER_FEED).map(item => ({
      title: decodeEntities(item.title?.[0] || ''),
      url: item.link?.[0] || item.guid?.[0]?._ || item.guid?.[0] || '',
      summary: stripHtml(item.description?.[0] || item['content:encoded']?.[0] || '').slice(0, 300),
      pubDate: item.pubDate?.[0] || '',
    }));
  }

  // Atom
  if (parsed?.feed?.entry) {
    return parsed.feed.entry.slice(0, MAX_ITEMS_PER_FEED).map(entry => ({
      title: decodeEntities(entry.title?.[0]?._ || entry.title?.[0] || ''),
      url: entry.link?.[0]?.$.href || entry.link?.[0] || '',
      summary: stripHtml(entry.summary?.[0]?._ || entry.summary?.[0] || entry.content?.[0]?._ || '').slice(0, 300),
      pubDate: entry.published?.[0] || entry.updated?.[0] || '',
    }));
  }

  throw new Error('Nessun item trovato nel feed');
}

// ─── Jina Scraper ─────────────────────────────────────────────────────────────

async function fetchJina(homepageUrl) {
  const jinaUrl = `https://r.jina.ai/${homepageUrl}`;
  const res = await fetch(jinaUrl, {
    headers: {
      'Accept': 'text/plain',
      'X-Return-Format': 'markdown',
    },
    signal: AbortSignal.timeout(JINA_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const markdown = await res.text();
  return extractItemsFromMarkdown(markdown, homepageUrl);
}

function extractItemsFromMarkdown(markdown, baseUrl) {
  const lines = markdown.split('\n');
  const items = [];
  const seenTitles = new Set();
  const linkRe = /\[([^\]]{25,200})\]\((https?:\/\/[^\)]+)\)/g;

  for (const line of lines) {
    let match;
    while ((match = linkRe.exec(line)) !== null) {
      const title = cleanText(match[1]);
      const url = match[2];
      if (isJunkTitle(title)) continue;
      if (seenTitles.has(title)) continue;
      try {
        if (!url.includes(new URL(baseUrl).hostname)) continue;
      } catch { continue; }
      seenTitles.add(title);
      items.push({ title, url, summary: '', pubDate: '' });
      if (items.length >= MAX_ITEMS_PER_FEED) break;
    }
    if (items.length >= MAX_ITEMS_PER_FEED) break;
  }

  // Fallback: heading che sembrano titoli articolo
  if (items.length < 3) {
    for (const line of lines) {
      const headingMatch = line.trim().match(/^#{1,3}\s+(.{30,200})$/);
      if (headingMatch) {
        const title = cleanText(headingMatch[1]);
        if (!isJunkTitle(title) && !seenTitles.has(title)) {
          seenTitles.add(title);
          items.push({ title, url: baseUrl, summary: '', pubDate: '' });
          if (items.length >= MAX_ITEMS_PER_FEED) break;
        }
      }
    }
  }

  return items;
}

function isJunkTitle(title) {
  return /^(menu|login|subscribe|home|about|contact|newsletter|cookie|privacy|search|share|tweet|facebook|instagram|seguici|accedi|abbonati|registrati|leggi|seguire|edizione|imagen|image|\!\[|donate|support|non-profit|reader-funded)/i.test(title)
    || title.length < 25
    || /^\d+$/.test(title)
    || title.startsWith('![');
}

function cleanText(text) {
  return text
    .replace(/&#\d+;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(text) {
  return text.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── Scraper dispatcher ───────────────────────────────────────────────────────

async function scrape(newspaper) {
  if (newspaper.scrape_method === 'rss' && newspaper.rss_url) {
    return { method: 'rss', items: await fetchRSS(newspaper.rss_url) };
  } else if (newspaper.scrape_method === 'jina') {
    return { method: 'jina', items: await fetchJina(newspaper.url) };
  }
  throw new Error('Nessun metodo di scraping configurato');
}

// ─── AI Recap (Gemini 2.0 Flash) ─────────────────────────────────────────────

function buildRecapPrompt(newspaper, items) {
  const headlines = items.map((item, i) =>
    `${i + 1}. ${item.title}${item.summary ? `\n   Sintesi: ${item.summary}` : ''}\n   URL: ${item.url}`
  ).join('\n\n');

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
${headlines}`;
}

async function generateRecap(newspaper, items) {
  if (!genai) {
    return { dry_run: true, raw_items: items.slice(0, 5) };
  }

  const model = genai.getGenerativeModel({ model: GEMINI_MODEL });
  const prompt = buildRecapPrompt(newspaper, items);
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  const jsonMatch = text.match(/\{[\s\S]+\}/);
  if (!jsonMatch) throw new Error('Risposta AI non è JSON valido');
  return JSON.parse(jsonMatch[0]);
}

// ─── Daily Brief ──────────────────────────────────────────────────────────────

function buildBriefPrompt(recaps) {
  const summaries = recaps.map(r => {
    const headlines = r.recap?.headlines?.map(h => `  - ${h.title} [${h.topic}]`).join('\n') || '';
    const narrative = r.recap?.recap_text || '(nessun recap)';
    return `## ${r.newspaper.name} (${r.newspaper.country})\n${narrative}\nHeadline:\n${headlines}`;
  }).join('\n\n');

  return `Sei un editor senior di una rassegna stampa internazionale progressista. Hai ricevuto i recap delle seguenti testate di oggi:

${summaries}

Scrivi il "Brief del giorno": massimo 4 righe. Sii conciso e incisivo.
NON riassumere una singola testata. Il brief DEVE confrontare le coperture di TUTTE le testate selezionate, evidenziando cosa copre una e ignora l'altra. Esempio: "Il Manifesto apre sull'escalation in Libano, The Guardian si concentra sull'Africa, El Salto dà spazio alla Cisgiordania."
Usa un tono giornalistico, asciutto ma non freddo. Scrivi in italiano. Inizia direttamente con il contenuto, senza intestazioni.`;
}

async function generateBrief(recaps) {
  if (!genai) {
    return { dry_run: true };
  }

  const model = genai.getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent(buildBriefPrompt(recaps));
  return { brief_text: result.response.text().trim() };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('=== EDI PIPELINE — SCRAPING + RECAP AI ===');
console.log(`Data: ${new Date().toISOString()}`);
console.log(`Testate: ${targets.map(n => n.name).join(', ')}`);
console.log(`Modello: ${GEMINI_KEY ? `🤖 Gemini ${GEMINI_MODEL}` : '🔍 DRY RUN (no API key)'}`);
console.log('');

const recapResults = [];

for (const newspaper of targets) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📰 ${newspaper.name} [${newspaper.country}] — ${newspaper.scrape_method.toUpperCase()}`);
  console.log('═'.repeat(60));

  try {
    process.stdout.write('  Scraping... ');
    const { method, items } = await scrape(newspaper);
    console.log(`✅ ${items.length} articoli via ${method}`);

    if (items.length === 0) {
      console.log('  ⚠️  Nessun articolo trovato, skip.');
      continue;
    }

    console.log('\n  Headline grezze:');
    items.slice(0, 5).forEach((item, i) => {
      console.log(`    ${i + 1}. ${item.title.slice(0, 90)}`);
    });

    process.stdout.write('\n  Generazione recap... ');
    const recap = await generateRecap(newspaper, items);
    console.log('✅');

    if (recap.dry_run) {
      console.log('\n  [DRY RUN] Headline grezze (no API key):');
      recap.raw_items.forEach((h, i) => console.log(`    ${i + 1}. ${h.title.slice(0, 90)}`));
    } else {
      console.log('\n  📌 5 Headline in italiano:');
      recap.headlines?.forEach((h, i) => {
        console.log(`    ${i + 1}. [${h.topic}] ${h.title}`);
        console.log(`       → ${h.summary}`);
        console.log(`       🔗 ${h.url}`);
      });
    }

    recapResults.push({ newspaper, items, recap });

  } catch (err) {
    console.log(`❌ Errore: ${err.message}`);
  }
}

// Brief del giorno
let briefText = null;
if (recapResults.length > 0) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log('🌅 BRIEF DEL GIORNO (cross-testata)');
  console.log('═'.repeat(60));

  try {
    const brief = await generateBrief(recapResults);
    if (brief.dry_run) {
      console.log('\n  [DRY RUN] Brief non generato (no API key).');
    } else {
      briefText = brief.brief_text;
      console.log(`\n${brief.brief_text}`);
    }
  } catch (err) {
    console.log(`❌ Errore brief: ${err.message}`);
  }
}

// Salva JSON per il frontend (--save-json)
if (saveJson && recapResults.length > 0) {
  const out = {
    date: new Date().toISOString().split('T')[0],
    brief: briefText,
    recaps: recapResults
      .filter(r => !r.recap.dry_run)
      .map(r => ({
        newspaper: {
          slug: r.newspaper.id,
          name: r.newspaper.name,
          country: r.newspaper.country,
          region: r.newspaper.region,
          language: r.newspaper.language,
          orientation: r.newspaper.orientation,
          url: r.newspaper.url,
        },
        headlines: r.recap.headlines ?? [],
      })),
  };
  const outPath = resolve(__dirname, '../pipeline-output.json');
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\n💾 JSON salvato in pipeline-output.json`);
}

// Salva su Supabase (se le credenziali sono disponibili)
if (supabase && recapResults.length > 0) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log('💾 SALVATAGGIO SU SUPABASE');
  console.log('═'.repeat(60));

  const date = new Date().toISOString().split('T')[0];

  for (const r of recapResults) {
    if (r.recap.dry_run) continue;
    try {
      // Lookup newspaper UUID by slug
      const { data: np } = await supabase
        .from('newspapers')
        .select('id')
        .eq('slug', r.newspaper.id)
        .single();

      if (!np) {
        console.log(`  ⚠️  ${r.newspaper.name}: non trovato nel DB (slug: ${r.newspaper.id})`);
        continue;
      }

      const { error } = await supabase.from('daily_recaps').upsert({
        newspaper_id: np.id,
        date,
        headlines: r.recap.headlines ?? [],
        generated_at: new Date().toISOString(),
      }, { onConflict: 'newspaper_id,date' });

      if (error) {
        console.log(`  ❌ ${r.newspaper.name}: ${error.message}`);
      } else {
        console.log(`  ✅ ${r.newspaper.name}: ${r.recap.headlines?.length ?? 0} headline salvate`);
      }
    } catch (err) {
      console.log(`  ❌ ${r.newspaper.name}: ${err.message}`);
    }
  }

  if (briefText) {
    const { error } = await supabase.from('daily_briefs').upsert({
      date,
      brief_text: briefText,
      generated_at: new Date().toISOString(),
    }, { onConflict: 'date' });
    console.log(error ? `  ❌ Brief: ${error.message}` : '  ✅ Brief salvato');
  }
} else if (!supabase) {
  console.log('\n⚠️  Supabase non configurato (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY mancanti) — skip save.');
}

console.log('\n\n=== FINE PIPELINE ===');
