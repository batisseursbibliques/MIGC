// Bible intégrée : fichiers JSON dans /public/bibles (aucun service externe).
// Structure d'un fichier : [livre][chapitre][verset] ; les livres sont dans l'ordre classique (66 livres).
export const VERSIONS = [
  { code: 'lsg', label: 'Louis Segond (1910)' },
  { code: 'darby', label: 'Darby' },
  { code: 'martin', label: 'Martin (1744)' },
  { code: 'crampon', label: 'Crampon (1923)' },
  { code: 'kjv', label: 'King James (anglais)' },
]

// Versions protégées par des droits d'auteur : on renvoie vers un site biblique officiel
export const lienAutresVersions = (titre) =>
  `https://www.biblegateway.com/passage/?search=${encodeURIComponent(titre)}&version=S21`

const LIVRES = [
  'Genèse', 'Exode', 'Lévitique', 'Nombres', 'Deutéronome', 'Josué', 'Juges', 'Ruth', '1 Samuel', '2 Samuel', '1 Rois', '2 Rois',
  '1 Chroniques', '2 Chroniques', 'Esdras', 'Néhémie', 'Esther', 'Job', 'Psaumes', 'Proverbes', 'Ecclésiaste', 'Cantique des cantiques',
  'Ésaïe', 'Jérémie', 'Lamentations', 'Ézéchiel', 'Daniel', 'Osée', 'Joël', 'Amos', 'Abdias', 'Jonas', 'Michée', 'Nahum', 'Habacuc',
  'Sophonie', 'Aggée', 'Zacharie', 'Malachie', 'Matthieu', 'Marc', 'Luc', 'Jean', 'Actes', 'Romains', '1 Corinthiens', '2 Corinthiens',
  'Galates', 'Éphésiens', 'Philippiens', 'Colossiens', '1 Thessaloniciens', '2 Thessaloniciens', '1 Timothée', '2 Timothée', 'Tite',
  'Philémon', 'Hébreux', 'Jacques', '1 Pierre', '2 Pierre', '1 Jean', '2 Jean', '3 Jean', 'Jude', 'Apocalypse',
]

const ALIAS = [
  'genese gen ge gn genesis', 'exode ex exo exod exodus', 'levitique lev lv leviticus', 'nombres nb nom num nombre numbers',
  'deuteronome deut dt deuteronomy', 'josue jos josh joshua', 'juges jug jg juge judges', 'ruth ru rt',
  '1samuel 1sam 1sa 1s', '2samuel 2sam 2sa 2s', '1rois 1roi 1r 1ro 1kings 1ki 1kgs', '2rois 2roi 2r 2ro 2kings 2ki 2kgs',
  '1chroniques 1chron 1chr 1ch', '2chroniques 2chron 2chr 2ch', 'esdras esd ezra', 'nehemie neh ne nehemiah',
  'esther est esth', 'job jb', 'psaumes psaume ps psa pss psalm psalms', 'proverbes prov pr pro proverbs',
  'ecclesiaste eccl ecc ec qoheleth ecclesiastes', 'cantiquedescantiques cantique cant ct cantiques songofsolomon songofsongs song',
  'esaie isaie es esa isaiah is', 'jeremie jer jr je jeremiah', 'lamentations lam lm la', 'ezechiel ez eze ezek ezec ezekiel',
  'daniel dan da dn', 'osee os hos hosea', 'joel jl joe', 'amos am', 'abdias abd ab obadiah obad', 'jonas jon jonah',
  'michee mic mi micah', 'nahum nah na', 'habacuc hab ha habakkuk', 'sophonie sop so zeph zephaniah', 'aggee ag agg hag haggai',
  'zacharie zac za zech zechariah', 'malachie mal ml malachi',
  'matthieu mat matt mt matthew', 'marc mar mc mk mark', 'luc lu lc luke', 'jean jn john', 'actes ac act acts',
  'romains rom ro rm romans', '1corinthiens 1cor 1co', '2corinthiens 2cor 2co', 'galates gal ga galatians',
  'ephesiens eph ep ephesians', 'philippiens phil php ph philippians', 'colossiens col colossians',
  '1thessaloniciens 1thess 1th 1thes', '2thessaloniciens 2thess 2th 2thes', '1timothee 1tim 1ti 1tm', '2timothee 2tim 2ti 2tm',
  'tite tit tt titus', 'philemon phm philem', 'hebreux heb he hebrews', 'jacques jac jc jas james',
  '1pierre 1pi 1pie 1pe 1p 1pet 1peter', '2pierre 2pi 2pie 2pe 2p 2pet 2peter', '1jean 1jn 1jo 1john', '2jean 2jn 2jo 2john',
  '3jean 3jn 3jo 3john', 'jude jud', 'apocalypse apoc apo ap rev revelation revelations',
]

const sansAccent = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const INDEX = new Map()
ALIAS.forEach((ligne, i) => ligne.split(' ').forEach((a) => INDEX.set(a, i)))
const ROMAIN = { i: '1', ii: '2', iii: '3' }
const UN_CHAPITRE = [30, 56, 62, 63, 64] // Abdias, Philémon, 2 Jean, 3 Jean, Jude (index 0)

// "Jean 3:16-18", "1 Corinthiens 13:4-7", "Psaumes 23", "Jn 3.16" → { livre, chapitre, debut, fin, titre }
export function analyserReference(texte) {
  const brut = sansAccent(String(texte)).replace(/[«»"“”]/g, '').replace(/\s+/g, ' ').trim()
  const m = brut.match(/^(?:(\d|iii|ii|i)\s*(?:er|ere|re|e|eme)?\.?\s*)?([a-z][a-z' ]*?)\.?\s*(\d{1,3})(?:\s*(?:[:.,]|v\.?|vv\.?)\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?)?\.?$/)
  if (!m) return null
  const prefixe = m[1] ? (ROMAIN[m[1]] ?? m[1]) : ''
  const nom = m[2].replace(/\s+/g, '').replace(/'/g, '')
  const livre = INDEX.get(prefixe + nom) ?? INDEX.get(nom)
  if (livre === undefined) return null
  let chapitre = Number(m[3]); let debut = m[4] ? Number(m[4]) : null; let fin = m[5] ? Number(m[5]) : debut
  if (UN_CHAPITRE.includes(livre) && debut === null) { debut = chapitre; fin = chapitre; chapitre = 1 }
  const plage = debut ? (fin && fin !== debut ? `${debut}-${fin}` : `${debut}`) : ''
  return { livre, chapitre, debut, fin, titre: `${LIVRES[livre]} ${chapitre}${plage ? `:${plage}` : ''}` }
}

const cache = {}
export function chargerVersion(code) {
  if (!cache[code]) {
    cache[code] = fetch(`/bibles/${code}.json`).then((r) => {
      if (!r.ok) throw new Error('bible')
      return r.json()
    }).catch((e) => { delete cache[code]; throw e })
  }
  return cache[code]
}

// Renvoie { titre, versets: [{ n, texte }] } ou { erreur: 'reference' | 'introuvable' | 'reseau' }
export async function lireVersets(ref, code) {
  const a = analyserReference(ref)
  if (!a) return { erreur: 'reference' }
  let bible
  try { bible = await chargerVersion(code) } catch { return { erreur: 'reseau' } }
  const chap = bible[a.livre]?.[a.chapitre - 1]
  if (!chap) return { erreur: 'introuvable' }
  const debut = a.debut ?? 1; const fin = a.debut ? a.fin : chap.length
  const versets = []
  for (let v = debut; v <= Math.min(fin, debut + 79); v++) if (chap[v - 1]) versets.push({ n: v, texte: chap[v - 1] })
  if (!versets.length) return { erreur: 'introuvable' }
  return { titre: a.titre, versets }
}
