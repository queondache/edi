#!/usr/bin/env node
/**
 * EDI - RSS Feed Re-test for 10 failed feeds
 * Run: node test-rss-fixes.mjs
 * 
 * Tests corrected/alternative URLs for the feeds that failed
 */

const fixes = [
  {
    name: "Fanpage",
    note: "Original feed URL was correct but returned 403. Trying with different headers.",
    feeds: [
      "https://www.fanpage.it/feed/",
      "https://www.fanpage.it/politica/feed/",
      "https://www.fanpage.it/attualita/feed/",
    ]
  },
  {
    name: "Público (ES)",
    note: "Try publico.es with different paths",
    feeds: [
      "https://www.publico.es/rss/",
      "https://www.publico.es/rss/politica",
      "https://feeds.feedburner.com/publico/portada",
    ]
  },
  {
    name: "El Salto",
    note: "HTTP 406 - try alternative content types",
    feeds: [
      "https://www.elsaltodiario.com/rss",
      "https://www.elsaltodiario.com/feed",
      "https://www.elsaltodiario.com/rss/portada",
    ]
  },
  {
    name: "Página 12",
    note: "Confirmed feed URL from Feedspot: pagina12.com.ar/rss/portada. Pagina12 may have disabled RSS (their /usuarios/rss.php says 'Funcionalidad desactivada')",
    feeds: [
      "https://www.pagina12.com.ar/rss/portada",
      "https://www.pagina12.com.ar/rss/secciones/el-pais",
      "https://www.pagina12.com.ar/rss/secciones/economia",
    ]
  },
  {
    name: "La Jornada",
    note: "Confirmed feeds from their RSS page (jornada.com.mx/rss/). New URL format uses /feeds/ path",
    feeds: [
      "https://www.jornada.com.mx/rss/edicion.xml",
      "https://www.jornada.com.mx/feeds/categoria/politica.atom",
      "https://www.jornada.com.mx/feeds/mundo.atom",
      "https://www.jornada.com.mx/rss/portada.xml",
    ]
  },
  {
    name: "Prensa Latina",
    note: "Cuban site - may block foreign IPs or have intermittent connectivity",
    feeds: [
      "https://www.prensalatina.cu/feed/",
      "https://www.prensalatina.cu/rss/",
    ]
  },
  {
    name: "Telesur",
    note: "Try different feed paths",
    feeds: [
      "https://www.telesurtv.net/rss/news.xml",
      "https://www.telesurtv.net/feed/",
      "https://www.telesurtv.net/rss/portada.xml",
    ]
  },
  {
    name: "Brasil de Fato",
    note: "Feed returned data but no items parsed. Try alternative URLs",
    feeds: [
      "https://www.brasildefato.com.br/rss2.xml",
      "https://www.brasildefato.com.br/feed",
      "https://www.brasildefato.com.br/rss",
    ]
  },
  {
    name: "Plaza Pública",
    note: "Guatemalan site, try WordPress default",
    feeds: [
      "https://www.plazapublica.com.gt/feed/",
      "https://www.plazapublica.com.gt/feed",
      "https://www.plazapublica.com.gt/rss",
    ]
  },
  {
    name: "The Wire",
    note: "Feed returned data but no items. Try section-specific feeds",
    feeds: [
      "https://thewire.in/feed",
      "https://thewire.in/category/politics/feed",
      "https://thewire.in/category/world/feed",
    ]
  },
];

async function testFeed(url, timeout = 20000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/rss+xml,application/atom+xml',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8,it;q=0.7',
      },
      redirect: 'follow',
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}`, url };
    }
    
    const text = await response.text();
    
    // Parse titles
    const titleRegex = /<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/gi;
    const titles = [];
    let match;
    let skip = true;
    
    while ((match = titleRegex.exec(text)) !== null) {
      if (skip) { skip = false; continue; }
      const title = match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
      if (title && title.length > 5) titles.push(title);
    }
    
    const itemCount = (text.match(/<item[\s>]/gi) || []).length + 
                      (text.match(/<entry[\s>]/gi) || []).length;
    
    if (titles.length === 0 && itemCount === 0) {
      // Show what we got for debugging
      const preview = text.substring(0, 500).replace(/\s+/g, ' ');
      return { ok: false, error: `No items found (${text.length} bytes)`, url, preview };
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
  console.log('=== EDI RSS FIX TEST ===');
  console.log(`Testing corrected URLs for ${fixes.length} failed feeds...`);
  console.log(`Date: ${new Date().toISOString()}\n`);
  
  const finalResults = [];
  
  for (const paper of fixes) {
    console.log(`\n--- ${paper.name} ---`);
    console.log(`Note: ${paper.note}`);
    
    let bestResult = null;
    
    for (const feedUrl of paper.feeds) {
      console.log(`  Trying: ${feedUrl}`);
      const result = await testFeed(feedUrl);
      
      if (result.ok) {
        console.log(`  ✅ WORKS! Items: ${result.itemCount}`);
        result.headlines.slice(0, 3).forEach(h => {
          console.log(`     → ${h.substring(0, 100)}`);
        });
        bestResult = result;
        break;
      } else {
        console.log(`  ❌ ${result.error}`);
        if (result.preview) {
          console.log(`     Preview: ${result.preview.substring(0, 200)}`);
        }
        if (!bestResult) bestResult = result;
      }
    }
    
    finalResults.push({
      name: paper.name,
      result: bestResult,
    });
  }
  
  // Summary
  console.log('\n\n=== FINAL RESULTS ===');
  const fixed = finalResults.filter(r => r.result.ok);
  const stillBroken = finalResults.filter(r => !r.result.ok);
  
  console.log(`\n✅ Fixed (${fixed.length}):`);
  fixed.forEach(r => console.log(`  ${r.name}: ${r.result.url}`));
  
  console.log(`\n❌ Still broken - need Jina Reader fallback (${stillBroken.length}):`);
  stillBroken.forEach(r => console.log(`  ${r.name}: ${r.result.error}`));
  
  console.log('\n\nFor broken feeds, use Jina Reader as fallback:');
  console.log('  https://r.jina.ai/{newspaper_url}');
  console.log('  This scrapes the homepage and returns clean text.');
}

main().catch(console.error);
