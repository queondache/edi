export type Region = 'europa' | 'america-latina' | 'uk-us' | 'medio-oriente' | 'africa' | 'asia'
export type Topic = 'politica' | 'geopolitica' | 'diritti' | 'clima' | 'economia' | 'lavoro' | 'cultura' | 'conflitti' | 'migrazioni' | 'società'

export interface Newspaper {
  id: string
  slug: string
  name: string
  country: string
  region: Region
  language: string
  orientation: string
  frequency: string
  description: string
  url: string
  rss_url: string | null
  scrape_method: 'rss' | 'jina'
  topics: string[]
  active: boolean
}

export interface Headline {
  title: string
  summary: string
  url: string
  topic: string
  pubDate?: string // ISO string
}

export interface DailyRecap {
  newspaper: Newspaper
  headlines: Headline[]
}

export function formatOrientation(orientation: string): string {
  const map: Record<string, string> = {
    'sinistra': 'Progressista',
    'sinistra-critica': 'Progressista radicale',
    'sinistra-intellettuale': 'Progressista intellettuale',
    'sinistra-investigativo': 'Progressista investigativo',
    'verde-sinistra': 'Verde progressista',
    'statale-sinistra': 'Progressista statale',
    'progressista': 'Progressista',
    'indipendente-progressista': 'Indipendente progressista',
    'progressista-critico': 'Progressista critico',
    'progressista-liberal': 'Progressista liberal',
    'indipendente-investigativo': 'Investigativo indipendente',
    'indipendente': 'Indipendente',
    'mainstream': 'Indipendente',
  }
  return map[orientation] ?? orientation
}

export interface OnboardingState {
  regions: Region[]
  topics: Topic[]
  politicalPosition: number // 1-5
  selectedNewspaperSlugs: string[]
}
