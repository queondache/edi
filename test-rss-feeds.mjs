#!/usr/bin/env node
/**
 * EDI - RSS Feed Test Script
 * Run: node test-rss-feeds.mjs
 * 
 * Tests all 33 newspaper RSS feeds and outputs:
 * - Which feeds work
 * - How many articles per feed
 * - Sample headlines
 * - Which feeds need Jina Reader fallback
 */

const newspapers = [
  { id: "il-manifesto", name: "Il Manifesto", feeds: ["https://ilmanifesto.it/feed/"] },
  { id: "fanpage", name: "Fanpage", feeds: ["https://www.fanpage.it/feed/"] },
  { id: "domani", name: "Domani", feeds: ["https://www.editorialedomani.it/rss", "https://editorialedomani.it/rss"] },
  { id: "eldiario", name: "elDiario.es", feeds: ["https://www.eldiario.es/rss/"] },
  { id: "publico", name: "Público", feeds: ["https://www.publico.es/rss/"] },
  { id: "el-salto", name: "El Salto", feeds: ["https://www.elsaltodiario.com/rss"] },
  { id: "pagina12", name: "Página 12", feeds: ["https://www.pagina12.com.ar/rss/portada"] },
  { id: "la-jornada", name: "La Jornada", feeds: ["https://www.jornada.com.mx/rss/portada.xml"] },
  { id: "prensa-latina", name: "Prensa Latina", feeds: ["https://www.prensalatina.cu/feed/"] },
  { id: "telesur", name: "Telesur", feeds: ["https://www.telesurtv.net/rss/news.xml"] },
  { id: "revista-anfibia", name: "Revista Anfibia", feeds: ["https://www.revistaanfibia.com/feed/"] },
  { id: "ciper-chile", name: "CIPER Chile", feeds: ["https://www.ciperchile.cl/feed/"] },
  { id: "pie-de-pagina", name: "Pie de Página", feeds: ["https://piedepagina.mx/feed/"] },
  { id: "brasil-de-fato", name: "Brasil de Fato", feeds: ["https://www.brasildefato.com.br/rss2.xml"] },
  { id: "plaza-publica", name: "Plaza Pública", feeds: ["https://www.plazapublica.com.gt/feed/"] },
  { id: "liberation", name: "Libération", feeds: ["https://www.liberation.fr/arc/outboundfeeds/rss-all/collection/accueil-une/?outputType=xml"] },
  { id: "le-monde-diplomatique", name: "Le Monde Diplomatique", feeds: ["https://www.monde-diplomatique.fr/recents.xml"] },
  { id: "the-guardian", name: "The Guardian", feeds: ["https://www.theguardian.com/world/rss"] },
  { id: "al-jazeera", name: "Al Jazeera", feeds: ["https://www.aljazeera.com/xml/rss/all.xml"] },
  { id: "the-independent", name: "The Independent", feeds: ["https://www.independent.co.uk/news/world/rss"] },
  { id: "the-intercept", name: "The Intercept", feeds: ["https://theintercept.com/feed/?rss"] },
  { id: "jacobin", name: "Jacobin", feeds: ["https://jacobin.com/feed/"] },
  { id: "972-magazine", name: "+972 Magazine", feeds: ["https://www.972mag.com/feed/"] },
  { id: "middle-east-eye", name: "Middle East Eye", feeds: ["https://www.middleeasteye.net/rss"] },
  { id: "mondoweiss", name: "Mondoweiss", feeds: ["https://mondoweiss.net/feed/"] },
  { id: "daily-maverick", name: "Daily Maverick", feeds: ["https://www.dailymaverick.co.za/dmrss/"] },
  { id: "mail-guardian", name: "Mail & Guardian", feeds: ["https://mg.co.za/feed/"] },
  { id: "the-wire", name: "The Wire", feeds: ["https://thewire.in/feed"] },
  { id: "the-diplomat", name: "The Diplomat", feeds: ["https://thediplomat.com/feed/"] },
  { id: "scmp", name: "SCMP", feeds: ["https://www.scmp.com/rss/91/feed"] },
  { id: "taz", name: "TAZ", feeds: ["https://taz.de/!p4608;rss/"] },
  { id: "mediapart", name: "Mediapart", feeds: ["https://www.mediapart.fr/articles/feed"] },
  { id: "balkan-insight", name: "Balkan Insight", feeds: ["https://balkaninsight.com/feed/"] },
];

async function testFeed(url, timeout = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EdiBot/1.0; RSS Reader)',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}`, url };
    }
    
    const text = await response.text();
    
    // Simple XML parsing for titles
    const titleRegex = /<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/gi;
    const titles = [];
    let match;
    let skip = true; // Skip first title (feed title)
    
    while ((match = titleRegex.exec(text)) !== null) {
      if (skip) { skip = false; continue; }
      const title = match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
      if (title) titles.push(title);
    }
    
    // Count items
    const itemCount = (text.match(/<item[\s>]/gi) || []).length + 
                      (text.match(/<entry[\s>]/gi) || []).length;
    
    if (titles.length === 0 && itemCount === 0) {
      return { ok: false, error: 'No items found in feed', url, bytes: text.length };
    }
    
    return {
      ok: true,
      url,
      itemCount: itemCount || titles.length,
      headlines: titles.slice(0, 5),
      bytes: text.length,
    };
    
  } catch (err) {
    clearTimeout(timeoutId);
    return { ok: false, error: err.message, url };
  }
}

async function main() {
  console.log('=== EDI RSS FEED TEST ===');
  console.log(`Testing ${newspapers.length} newspapers...`);
  console.log(`Date: ${new Date().toISOString()}\n`);
  
  const results = [];
  
  for (const paper of newspapers) {
    let bestResult = null;
    
    for (const feedUrl of paper.feeds) {
      const result = await testFeed(feedUrl);
      if (result.ok) {
        bestResult = result;
        break;
      }
      if (!bestResult) bestResult = result;
    }
    
    const icon = bestResult.ok ? '✅' : '❌';
    console.log(`${icon} ${paper.name}`);
    
    if (bestResult.ok) {
      console.log(`   Items: ${bestResult.itemCount} | URL: ${bestResult.url}`);
      bestResult.headlines.slice(0, 3).forEach(h => {
        console.log(`   → ${h.substring(0, 100)}`);
      });
    } else {
      console.log(`   Error: ${bestResult.error}`);
      console.log(`   URL: ${bestResult.url}`);
    }
    console.log('');
    
    results.push({
      id: paper.id,
      name: paper.name,
      ...bestResult,
    });
  }
  
  // Summary
  const ok = results.filter(r => r.ok);
  const fail = results.filter(r => !r.ok);
  
  console.log('\n=== SUMMARY ===');
  console.log(`✅ Working: ${ok.length}/${results.length}`);
  console.log(`❌ Failed: ${fail.length}/${results.length}`);
  
  if (fail.length > 0) {
    console.log('\nFailed feeds (need Jina Reader fallback):');
    fail.forEach(r => console.log(`  - ${r.name}: ${r.error}`));
  }
  
  console.log('\n=== FEED URLS FOR WORKING NEWSPAPERS ===');
  ok.forEach(r => console.log(`${r.name}: ${r.url}`));
}

main().catch(console.error);
