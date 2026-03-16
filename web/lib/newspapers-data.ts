import { Newspaper, Region, Topic } from './types'

export const ALL_NEWSPAPERS: Newspaper[] = [
  { id:'1', slug:'il-manifesto', name:'Il Manifesto', country:'IT', region:'europa', language:'it', orientation:'sinistra', frequency:'daily', description:'Quotidiano comunista italiano, fondato nel 1971. Voce storica della sinistra radicale.', url:'https://ilmanifesto.it', rss_url:'https://ilmanifesto.it/feed/', scrape_method:'rss', topics:['politica','lavoro','diritti','internazionale','cultura'], active:true },
  { id:'2', slug:'fanpage', name:'Fanpage', country:'IT', region:'europa', language:'it', orientation:'progressista', frequency:'daily', description:'Testata digitale italiana, forte su cronaca, diritti civili e inchieste sociali.', url:'https://www.fanpage.it', rss_url:'https://www.fanpage.it/feed/', scrape_method:'rss', topics:['cronaca','politica','diritti','società'], active:true },
  { id:'3', slug:'domani', name:'Domani', country:'IT', region:'europa', language:'it', orientation:'progressista', frequency:'daily', description:'Quotidiano fondato nel 2020. Progressista, buona copertura politica e clima.', url:'https://www.editorialedomani.it', rss_url:'https://www.editorialedomani.it/rss', scrape_method:'rss', topics:['politica','economia','clima','internazionale'], active:true },
  { id:'4', slug:'eldiario', name:'elDiario.es', country:'ES', region:'europa', language:'es', orientation:'progressista', frequency:'daily', description:'Digitale spagnolo reader-funded. Progressista, modello sostenibile.', url:'https://www.eldiario.es', rss_url:'https://www.eldiario.es/rss/', scrape_method:'rss', topics:['politica','economia','società','diritti'], active:true },
  { id:'5', slug:'publico', name:'Público', country:'ES', region:'europa', language:'es', orientation:'sinistra', frequency:'daily', description:'Quotidiano digitale spagnolo di sinistra. Buona copertura sociale e politica.', url:'https://www.publico.es', rss_url:'https://feeds.feedburner.com/publico/portada', scrape_method:'rss', topics:['politica','società','internazionale','diritti'], active:true },
  { id:'6', slug:'el-salto', name:'El Salto', country:'ES', region:'europa', language:'es', orientation:'sinistra', frequency:'daily', description:'Cooperativa giornalistica spagnola. Movimenti sociali, ecologismo, femminismo.', url:'https://www.elsaltodiario.com', rss_url:null, scrape_method:'jina', topics:['movimenti sociali','ecologia','femminismo','lavoro'], active:true },
  { id:'7', slug:'la-jornada', name:'La Jornada', country:'MX', region:'america-latina', language:'es', orientation:'sinistra', frequency:'daily', description:'Quotidiano messicano di sinistra. Storico, fondato nel 1984.', url:'https://www.jornada.com.mx', rss_url:'https://www.jornada.com.mx/rss/edicion.xml', scrape_method:'rss', topics:['politica','economia','indigeni','internazionale'], active:true },
  { id:'8', slug:'pagina12', name:'Página 12', country:'AR', region:'america-latina', language:'es', orientation:'progressista', frequency:'daily', description:'Quotidiano argentino, peronismo progressista.', url:'https://www.pagina12.com.ar', rss_url:null, scrape_method:'jina', topics:['politica','economia','cultura','internazionale'], active:false },
  { id:'9', slug:'prensa-latina', name:'Prensa Latina', country:'CU', region:'america-latina', language:'es', orientation:'statale-sinistra', frequency:'continuous', description:'Agenzia di stampa cubana. Prospettiva unica su LATAM e Global South.', url:'https://www.prensalatina.cu', rss_url:null, scrape_method:'jina', topics:['geopolitica','america-latina','internazionale'], active:false },
  { id:'10', slug:'telesur', name:'Telesur', country:'VE', region:'america-latina', language:'es', orientation:'statale-sinistra', frequency:'continuous', description:'Multistatale latinoamericano. Copertura regionale ampia, geopolitica Sud-Sud.', url:'https://www.telesurtv.net', rss_url:'https://www.telesurtv.net/feed/', scrape_method:'rss', topics:['geopolitica','america-latina','internazionale','movimenti sociali'], active:true },
  { id:'11', slug:'revista-anfibia', name:'Revista Anfibia', country:'AR', region:'america-latina', language:'es', orientation:'progressista', frequency:'weekly', description:'Giornalismo narrativo argentino. Accademia + strada, cronache lunghe.', url:'https://www.revistaanfibia.com', rss_url:'https://www.revistaanfibia.com/feed/', scrape_method:'rss', topics:['società','cultura','politica','diritti'], active:true },
  { id:'12', slug:'ciper-chile', name:'CIPER Chile', country:'CL', region:'america-latina', language:'es', orientation:'indipendente-investigativo', frequency:'regular', description:'Giornalismo investigativo cileno. Ha fatto cadere ministri.', url:'https://www.ciperchile.cl', rss_url:'https://www.ciperchile.cl/feed/', scrape_method:'rss', topics:['investigazione','corruzione','politica','diritti'], active:true },
  { id:'13', slug:'pie-de-pagina', name:'Pie de Página', country:'MX', region:'america-latina', language:'es', orientation:'progressista', frequency:'regular', description:'Testata messicana su diritti umani, migranti, comunità indigene.', url:'https://piedepagina.mx', rss_url:'https://piedepagina.mx/feed/', scrape_method:'rss', topics:['diritti umani','migranti','indigeni','violenza'], active:true },
  { id:'14', slug:'brasil-de-fato', name:'Brasil de Fato', country:'BR', region:'america-latina', language:'pt', orientation:'sinistra', frequency:'daily', description:'Quotidiano brasiliano di sinistra. Copertura Lula, BRICS, Amazzonia, MST.', url:'https://www.brasildefato.com.br', rss_url:'https://www.brasildefato.com.br/feed', scrape_method:'rss', topics:['politica','movimenti sociali','ambiente','diritti'], active:true },
  { id:'15', slug:'plaza-publica', name:'Plaza Pública', country:'GT', region:'america-latina', language:'es', orientation:'indipendente', frequency:'regular', description:'Giornalismo investigativo guatemalteco. Politica, diritti, corruzione.', url:'https://www.plazapublica.com.gt', rss_url:'https://www.plazapublica.com.gt/rss', scrape_method:'rss', topics:['investigazione','politica','diritti','corruzione'], active:true },
  { id:'16', slug:'liberation', name:'Libération', country:'FR', region:'europa', language:'fr', orientation:'sinistra', frequency:'daily', description:'Quotidiano francese di sinistra. Fondato nel 1973 da Sartre.', url:'https://www.liberation.fr', rss_url:'https://www.liberation.fr/arc/outboundfeeds/rss-all/collection/accueil-une/?outputType=xml', scrape_method:'rss', topics:['politica','società','cultura','internazionale'], active:true },
  { id:'17', slug:'le-monde-diplomatique', name:'Le Monde Diplomatique', country:'FR', region:'europa', language:'fr', orientation:'sinistra-critica', frequency:'monthly', description:'Mensile di analisi geopolitica critica, anti-imperialista. Riferimento globale.', url:'https://www.monde-diplomatique.fr', rss_url:'https://www.monde-diplomatique.fr/recents.xml', scrape_method:'rss', topics:['geopolitica','economia-critica','imperialismo','globalizzazione'], active:true },
  { id:'18', slug:'the-guardian', name:'The Guardian', country:'UK', region:'uk-us', language:'en', orientation:'progressista', frequency:'continuous', description:'Quotidiano britannico progressista. Il più letto in inglese tra le testate di qualità.', url:'https://www.theguardian.com', rss_url:'https://www.theguardian.com/world/rss', scrape_method:'rss', topics:['politica','clima','diritti','internazionale','cultura'], active:true },
  { id:'19', slug:'al-jazeera', name:'Al Jazeera', country:'QA', region:'medio-oriente', language:'en', orientation:'indipendente', frequency:'continuous', description:'Copertura Africa, Medio Oriente, Asia. Alternativa a CNN/BBC.', url:'https://www.aljazeera.com', rss_url:'https://www.aljazeera.com/xml/rss/all.xml', scrape_method:'rss', topics:['geopolitica','medio-oriente','africa','asia','conflitti'], active:true },
  { id:'20', slug:'the-independent', name:'The Independent', country:'UK', region:'uk-us', language:'en', orientation:'progressista-liberal', frequency:'continuous', description:'Quotidiano digitale britannico. Progressista-liberal.', url:'https://www.independent.co.uk', rss_url:'https://www.independent.co.uk/news/world/rss', scrape_method:'rss', topics:['politica','internazionale','società'], active:true },
  { id:'21', slug:'the-intercept', name:'The Intercept', country:'US', region:'uk-us', language:'en', orientation:'sinistra-investigativo', frequency:'regular', description:'Fondato da Greenwald. Sicurezza nazionale, sorveglianza, diritti civili.', url:'https://theintercept.com', rss_url:'https://theintercept.com/feed/?rss', scrape_method:'rss', topics:['sorveglianza','diritti civili','politica estera','giustizia'], active:true },
  { id:'22', slug:'jacobin', name:'Jacobin', country:'US', region:'uk-us', language:'en', orientation:'sinistra-intellettuale', frequency:'daily', description:'Rivista socialista americana. Analisi di classe, lavoro, politica.', url:'https://jacobin.com', rss_url:'https://jacobin.com/feed/', scrape_method:'rss', topics:['socialismo','lavoro','politica','economia'], active:true },
  { id:'23', slug:'972-magazine', name:'+972 Magazine', country:'IL/PS', region:'medio-oriente', language:'en', orientation:'progressista-critico', frequency:'regular', description:'Magazine israelo-palestinese. Voci critiche dall\'interno del conflitto.', url:'https://www.972mag.com', rss_url:'https://www.972mag.com/feed/', scrape_method:'rss', topics:['israele-palestina','diritti umani','occupazione','conflitto'], active:true },
  { id:'24', slug:'middle-east-eye', name:'Middle East Eye', country:'UK/ME', region:'medio-oriente', language:'en', orientation:'indipendente', frequency:'continuous', description:'Fondato da ex giornalisti Guardian. Copertura quotidiana Medio Oriente e Nord Africa.', url:'https://www.middleeasteye.net', rss_url:'https://www.middleeasteye.net/rss', scrape_method:'rss', topics:['medio-oriente','nord-africa','geopolitica','conflitti'], active:true },
  { id:'25', slug:'mondoweiss', name:'Mondoweiss', country:'US/PS', region:'medio-oriente', language:'en', orientation:'progressista', frequency:'daily', description:'Giornalismo indipendente su Palestina/Israele.', url:'https://mondoweiss.net', rss_url:'https://mondoweiss.net/feed/', scrape_method:'rss', topics:['palestina','israele','diritti umani','politica-usa'], active:true },
  { id:'26', slug:'daily-maverick', name:'Daily Maverick', country:'ZA', region:'africa', language:'en', orientation:'indipendente-progressista', frequency:'daily', description:'Sudafrica. Investigativo indipendente. BRICS dal lato africano.', url:'https://www.dailymaverick.co.za', rss_url:'https://www.dailymaverick.co.za/dmrss/', scrape_method:'rss', topics:['sudafrica','africa','BRICS','corruzione','politica'], active:true },
  { id:'27', slug:'mail-guardian', name:'Mail & Guardian', country:'ZA', region:'africa', language:'en', orientation:'indipendente', frequency:'daily', description:'Quotidiano sudafricano. Copertura politica e sociale africana.', url:'https://mg.co.za', rss_url:'https://mg.co.za/feed/', scrape_method:'rss', topics:['sudafrica','africa','politica','società'], active:true },
  { id:'28', slug:'the-wire', name:'The Wire', country:'IN', region:'asia', language:'en', orientation:'indipendente-progressista', frequency:'daily', description:'India. Indipendente, sotto attacco dal governo Modi.', url:'https://thewire.in', rss_url:null, scrape_method:'jina', topics:['india','asia','diritti','politica','geopolitica'], active:true },
  { id:'29', slug:'the-diplomat', name:'The Diplomat', country:'US/ASIA', region:'asia', language:'en', orientation:'indipendente', frequency:'daily', description:'Geopolitica indo-pacifica. Cina, ASEAN, Giappone, Corea.', url:'https://thediplomat.com', rss_url:'https://thediplomat.com/feed/', scrape_method:'rss', topics:['geopolitica','cina','asia-pacifico','sicurezza'], active:true },
  { id:'30', slug:'scmp', name:'South China Morning Post', country:'HK', region:'asia', language:'en', orientation:'mainstream', frequency:'continuous', description:'Hong Kong. Il più informato in inglese sulla Cina.', url:'https://www.scmp.com', rss_url:'https://www.scmp.com/rss/91/feed', scrape_method:'rss', topics:['cina','hong-kong','economia','geopolitica','tech'], active:true },
  { id:'31', slug:'taz', name:'TAZ', country:'DE', region:'europa', language:'de', orientation:'verde-sinistra', frequency:'daily', description:'Cooperativa giornalistica tedesca. Verde-sinistra, ecologismo.', url:'https://taz.de', rss_url:'https://taz.de/!p4608;rss/', scrape_method:'rss', topics:['politica','ecologia','società','internazionale'], active:true },
  { id:'32', slug:'mediapart', name:'Mediapart', country:'FR', region:'europa', language:'fr', orientation:'sinistra-investigativo', frequency:'daily', description:'Investigativo francese. Ha fatto scoppiare scandali enormi.', url:'https://www.mediapart.fr', rss_url:'https://www.mediapart.fr/articles/feed', scrape_method:'rss', topics:['investigazione','politica','corruzione','società'], active:true },
  { id:'33', slug:'balkan-insight', name:'Balkan Insight', country:'BALKANS', region:'europa', language:'en', orientation:'indipendente', frequency:'daily', description:'Copertura Balcani e Europa orientale. Geopolitica europea, transizione democratica.', url:'https://balkaninsight.com', rss_url:'https://balkaninsight.com/feed/', scrape_method:'rss', topics:['balcani','europa-orientale','geopolitica','democrazia'], active:true },
]

const ORIENTATION_SCORE: Record<string, number> = {
  'sinistra': 1, 'sinistra-critica': 1, 'sinistra-intellettuale': 1,
  'sinistra-investigativo': 1, 'verde-sinistra': 1, 'statale-sinistra': 1,
  'progressista': 2, 'indipendente-progressista': 2, 'progressista-critico': 2,
  'indipendente-investigativo': 2,
  'indipendente': 3,
  'progressista-liberal': 4,
  'mainstream': 5,
}

export function suggestNewspapers(
  regions: Region[],
  topics: string[],
  politicalPosition: number
): Newspaper[] {
  const active = ALL_NEWSPAPERS.filter(n => n.active)

  return active
    .map(n => {
      let score = 0
      // Regione
      if (regions.includes(n.region)) score += 3
      // Topic overlap
      const overlap = n.topics.filter(t =>
        topics.some(sel => t.toLowerCase().includes(sel.toLowerCase()) || sel.toLowerCase().includes(t.toLowerCase()))
      )
      score += overlap.length * 2
      // Orientamento: più vicino allo slider, più punteggio
      const oriScore = ORIENTATION_SCORE[n.orientation] ?? 3
      const distance = Math.abs(oriScore - politicalPosition)
      score += Math.max(0, 4 - distance)
      return { newspaper: n, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ newspaper }) => newspaper)
}
