const JINA_TESTATE = [
  { id: 'el-salto', name: 'El Salto', url: 'https://www.elsaltodiario.com' },
  { id: 'pagina12', name: 'Página 12', url: 'https://www.pagina12.com.ar' },
  { id: 'prensa-latina', name: 'Prensa Latina', url: 'https://www.prensalatina.cu' },
  { id: 'the-wire', name: 'The Wire', url: 'https://thewire.in' },
];

async function fetchJina(homepageUrl) {
  const jinaUrl = `https://r.jina.ai/${homepageUrl}`;
  const res = await fetch(jinaUrl, {
    headers: {
      'Accept': 'text/plain',
      'X-Return-Format': 'markdown',
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function extractHeadlines(markdown, maxItems = 5) {
  const lines = markdown.split('\n');
  const headlines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match markdown links: [Title](url) o ## Title o ### Title
    const linkMatch = trimmed.match(/^\[([^\]]{20,150})\]\(https?:\/\/[^\)]+\)/);
    const headingMatch = trimmed.match(/^#{1,3}\s+(.{20,150})$/);

    if (linkMatch) {
      const text = linkMatch[1].trim();
      if (!text.match(/^(menu|login|subscribe|home|about|contact|newsletter|cookie|privacy)/i)) {
        headlines.push(text);
      }
    } else if (headingMatch) {
      const text = headingMatch[1].trim();
      if (!text.match(/^(menu|login|subscribe|home|about|contact|newsletter|cookie|privacy)/i)) {
        headlines.push(text);
      }
    }

    if (headlines.length >= maxItems) break;
  }

  return headlines;
}

async function testJina(testata) {
  console.log(`\n--- ${testata.name} ---`);
  console.log(`  URL: ${testata.url}`);

  try {
    const content = await fetchJina(testata.url);
    const byteSize = Buffer.byteLength(content, 'utf8');
    console.log(`  ✅ Jina OK — ${byteSize.toLocaleString()} bytes`);

    // Preview first 200 chars
    const preview = content.replace(/\n+/g, ' ').slice(0, 200);
    console.log(`  Preview: ${preview}...`);

    // Extract headlines
    const headlines = extractHeadlines(content);
    if (headlines.length > 0) {
      console.log(`  Headlines trovate: ${headlines.length}`);
      headlines.forEach((h, i) => console.log(`    ${i + 1}. ${h.slice(0, 100)}`));
    } else {
      console.log(`  ⚠️  Nessuna headline estratta — potrebbe servire parsing personalizzato`);
    }

    return { ok: true, size: byteSize, headlines };
  } catch (err) {
    console.log(`  ❌ Errore: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

console.log('=== TEST JINA READER — 4 TESTATE SENZA RSS ===');
console.log(`Data: ${new Date().toISOString()}\n`);

const results = [];
for (const testata of JINA_TESTATE) {
  const result = await testJina(testata);
  results.push({ ...testata, ...result });
}

console.log('\n=== SUMMARY ===');
results.forEach(r => {
  const status = r.ok ? '✅' : '❌';
  const info = r.ok ? `${r.headlines?.length || 0} headline, ${(r.size / 1024).toFixed(0)}KB` : r.error;
  console.log(`${status} ${r.name}: ${info}`);
});

const allOk = results.every(r => r.ok);
console.log(`\nJina funziona: ${results.filter(r => r.ok).length}/4`);
