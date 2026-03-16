# EDI — Rassegna stampa AI personalizzata

## Cosa è
Web app che aggrega notizie da testate indipendenti e progressiste di tutto il mondo, genera recap AI in italiano ogni mattina, e suggerisce testate all'utente tramite un onboarding con identikit.

## Stack
- Next.js 14+ (App Router) su Vercel
- Supabase (auth magic link + PostgreSQL)
- RSS feeds come fonte primaria, Jina Reader (`https://r.jina.ai/{url}`) come fallback per testate senza RSS
- **Gemini 2.5 Flash** (`gemini-2.5-flash`, pacchetto `@google/generative-ai`) per generazione recap
- Vercel Cron per generazione mattutina
- Tutto in italiano (recap tradotti da qualsiasi lingua)
- `GEMINI_API_KEY` in `.env.local`

## Architettura

### Database (Supabase)

**newspapers**
- id (uuid, PK)
- slug (text, unique) — es. "il-manifesto"
- name (text)
- country (text) — codice paese es. "IT", "MX", "AR"
- region (text) — "europa", "america-latina", "uk-us", "medio-oriente", "africa", "asia"
- language (text) — "it", "es", "en", "fr", "pt", "de"
- orientation (text) — "sinistra", "progressista", "indipendente", etc.
- frequency (text) — "daily", "continuous", "weekly", "monthly", "regular"
- description (text) — descrizione breve in italiano
- url (text) — homepage
- rss_url (text, nullable) — URL RSS funzionante, null se usa Jina Reader
- scrape_method (text) — "rss" o "jina"
- topics (text[]) — array di topic
- active (boolean, default true)
- created_at, updated_at

**users** (gestito da Supabase Auth)

**user_profiles**
- id (uuid, PK, FK → auth.users)
- languages (text[]) — lingue che legge
- regions (text[]) — regioni di interesse
- topics (text[]) — temi di interesse
- political_position (integer) — 1-5 slider (1=sinistra radicale, 5=centro-sinistra)
- onboarding_completed (boolean)
- created_at, updated_at

**user_newspapers**
- user_id (uuid, FK)
- newspaper_id (uuid, FK)
- added_at (timestamp)
- PK (user_id, newspaper_id)

**daily_recaps**
- id (uuid, PK)
- newspaper_id (uuid, FK)
- date (date)
- headlines (jsonb) — array di {title, summary, url, topic}
- raw_content (text) — contenuto grezzo dallo scraping
- recap_text (text) — recap narrativo generato da AI
- generated_at (timestamp)
- UNIQUE (newspaper_id, date)

**daily_briefs**
- id (uuid, PK)
- date (date, unique)
- brief_text (text) — il "brief del giorno" cross-testata
- topics_covered (jsonb) — cluster tematici
- generated_at (timestamp)

### Flusso dati

1. **Cron mattutino (06:00 CET):**
   - Per ogni testata attiva: scraping via RSS o Jina Reader
   - Per ogni testata: genera recap con GPT-4o-mini (in italiano)
   - Dopo tutti i recap: genera brief del giorno cross-testata
   - Salva tutto in daily_recaps e daily_briefs

2. **Utente apre l'app:**
   - Se non ha completato onboarding → flusso onboarding
   - Se ha completato → vede brief del giorno + recap delle sue testate

### Onboarding (4 schermate)

1. **Regioni:** Quali aree del mondo ti interessano? (Europa, America Latina, USA/UK, Medio Oriente, Africa, Asia) — multi-select
2. **Temi:** Cosa ti interessa? (Politica, Geopolitica, Diritti umani, Clima/Ambiente, Economia, Lavoro, Cultura) — multi-select
3. **Orientamento:** slider visivo 1-5 senza label esplicite (da più radicale a più moderato)
4. **Testate suggerite:** basate sulle risposte, l'utente conferma/modifica la selezione

### Formato recap

**Brief del giorno** (in cima alla homepage):
4-5 righe che sintetizzano i temi caldi cross-testata. Evidenzia differenze di copertura tra testate. Es: "La Jornada e The Guardian aprono entrambi sulla crisi climatica, Il Manifesto si concentra sullo sciopero generale, Al Jazeera dà spazio all'escalation in Sudan."

**Per ogni testata:**
5 headline con:
- Titolo tradotto in italiano
- 1 riga di sintesi
- Link all'articolo originale
- Topic tag

### Monetizzazione (v1)
Tutto gratis. Trasparenza costi stile Guardian: "Oggi hai generato €0.03 di costi AI". No paywall, no Stripe. Solo sensibilizzazione.

### Costi stimati
- Gemini 2.0 Flash: ~€0.05/giorno per 33 testate (molto più economico di GPT-4o-mini)
- Supabase: free tier
- Vercel: free tier
- Jina Reader: gratuito (rate limit 20 req/min)

## File di riferimento
- `edi-newspapers.json` — database completo delle 33 testate con URL RSS da testare

## Task attuale

### TASK 1: Setup progetto + test feed RSS

1. Inizializza progetto Next.js con App Router, TypeScript, Tailwind
2. Leggi `edi-newspapers.json`
3. Scrivi uno script (`scripts/test-feeds.ts`) che testa TUTTI i feed RSS delle 33 testate:
   - Per ogni feed: HTTP GET, verifica che restituisca XML valido con almeno 1 item
   - Se il feed fallisce: prova URL alternativi comuni (/feed/, /rss/, /rss/portada, etc.)
   - Se nessun RSS funziona: testa Jina Reader (`https://r.jina.ai/{homepage_url}`) come fallback
   - Output: tabella con nome, status (ok/fail), metodo (rss/jina/fail), URL funzionante, numero articoli, 3 headline di esempio
4. Aggiorna `edi-newspapers.json` con le URL corrette e il metodo di scraping
5. Setup Supabase: crea le tabelle del database (schema sopra)
6. Seed della tabella newspapers con i dati aggiornati dal test

### Dopo il TASK 1
Torna da me con i risultati del test feed. Da lì procediamo col TASK 2 (recap engine).
