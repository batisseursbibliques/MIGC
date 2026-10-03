// Lecture de versets via l'API publique getBible (https://api.getbible.net/v2/{version}/{livre}/{chapitre}.json)
// Les livres sont numérotés de 1 à 66. On reconnaît les noms français et anglais, avec ou sans accents.

export const VERSIONS = [
  { code: 'ls1910', label: 'Louis Segond (1910)' },
  { code: 'darby', label: 'Darby (FR)' },
  { code: 'martin', label: 'Martin (1744)' },
  { code: 'kjv', label: 'King James (EN)' },
  { code: 'web', label: 'World English Bible' },
]

const LIVRES = [
  'genese gen ge gn genesis', 'exode ex exo exod exodus', 'levitique lev lv leviticus', 'nombres nb nom num nombre numbers',
  'deuteronome deut dt deuteronomy', 'josue jos josh joshua', 'juges jug jg juge judges', 'ruth ru rt',
  '1samuel 1sam 1sa 1s', '2samuel 2sam 2sa 2s', '1rois 1roi 1r 1kings 1ki 1kgs', '2rois 2roi 2r 2kings 2ki 2kgs',
  '1chroniques 1chron 1chr 1ch', '2chroniques 2chron 2chr 2ch', 'esdras esd ezra', 'nehemie neh ne nehemiah',
  'esther est esth', 'job jb', 'psaumes psaume ps psa pss psalm psalms', 'proverbes prov pr pro proverbs',
  'ecclesiaste eccl ecc ec qoheleth ecclesiastes', 'cantiquedescantiques cantique cant ct cantiques songofsolomon songofsongs song',
  'esaie esaïe isaie es esa isaiah is', 'jeremie jer je jeremiah', 'lamentations lam la', 'ezechiel ez eze ezek ezekiel',
  'daniel dan da dn', 'osee os hos hosea', 'joel jl', 'amos am', 'abdias abd ab obadiah obad', 'jonas jon jonah',
  'michee mic mi micah', 'nahum nah na', 'habacuc hab habakkuk', 'sophonie sop zeph zephaniah', 'aggee ag hag haggai',
  'zacharie zac za zech zechariah', 'malachie mal ml malachi',
  'matthieu mat matt mt matthew', 'marc mar mc mk mark', 'luc lu lc luke', 'jean jn jean john', 'actes ac act acts',
  'romains rom ro rm romans', '1corinthiens 1cor 1co corinthiens1', '2corinthiens 2cor 2co', 'galates gal ga galatians',
  'ephesiens eph ephesians', 'philippiens phil php philippians', 'colossiens col colossians',
  '1thessaloniciens 1thess 1th 1thes', '2thessaloniciens 2thess 2th 2thes', '1timothee 1tim 1ti', '2timothee 2tim 2ti',
  'tite tit titus', 'philemon phm philem', 'hebreux heb hebrews', 'jacques jac jc jas james',
  '1pierre 1pi 1pie 1pe 1pet 1peter', '2pierre 2pi 2pie 2pe 2pet 2peter', '1jean 1jn 1jo 1john', '2jean 2jn 2jo 2john',
  '3jean 3jn 3jo 3john', 'jude jud', 'apocalypse apoc ap rev revelation revelations',
]

const INDEX = new Map()
LIVRES.forEach((ligne, i) => ligne.split(' ').forEach((alias) => INDEX.set(sansAccent(alias), i + 1)))

function sansAccent(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const ROMAIN = { i: '1', ii: '2', iii: '3' }

// "1 Corinthiens 13:4-7" → { livre: 46, chapitre: 13, debut: 4, fin: 7 }
export function lireReference(texte) {
  const brut = sansAccent(String(texte)).replace(/[«»"“”]/g, '').replace(/\s+/g, ' ').trim()
  const m = brut.match(/^(?:(\d|iii|ii|i)\s*(?:er|ere|re|e|eme)?\.?\s*)?([a-z][a-z' ]*?)\.?\s*(\d{1,3})(?:\s*(?:[:.,]|v\.?|vv\.?)\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?)?\.?$/)
  if (!m) return null
  const prefixe = m[1] ? (ROMAIN[m[1]] ?? m[1]) : ''
  const nom = m[2].replace(/\s+/g, '').replace(/'/g, '')
  const livre = INDEX.get(prefixe + nom) ?? INDEX.get(nom)
  if (!livre) return null
  const debut = m[4] ? Number(m[4]) : null
  const fin = m[5] ? Number(m[5]) : debut
  // Livres d'un seul chapitre (Abdias, Philémon, 2 Jean, 3 Jean, Jude) : « 3 Jean 4 » désigne le verset 4
  if ([31, 57, 63, 64, 65].includes(livre) && debut === null) return { livre, chapitre: 1, debut: Number(m[3]), fin: Number(m[3]) }
  return { livre, chapitre: Number(m[3]), debut, fin }
}

function nettoyer(t) {
  return String(t ?? '').replace(/[\u200a\u2009\u202f]/g, ' ').replace(/^\s*\*+\s*/, '').replace(/✶/g, '').replace(/\s+/g, ' ').trim()
}

const cache = new Map()

// Renvoie { titre, versets: [{ n, texte }] } ou lève une Error dont .code vaut 'REFERENCE', 'ABSENT' ou 'RESEAU'
export async function chercherVerset(reference, version) {
  const ref = lireReference(reference)
  if (!ref) { const e = new Error('Référence non reconnue'); e.code = 'REFERENCE'; throw e }

  const cle = `${version}/${ref.livre}/${ref.chapitre}`
  let chapitre = cache.get(cle)
  if (!chapitre) {
    let rep
    try { rep = await fetch(`https://api.getbible.net/v2/${version}/${ref.livre}/${ref.chapitre}.json`) }
    catch { const e = new Error('Réseau'); e.code = 'RESEAU'; throw e }
    if (rep.status === 404) { const e = new Error('Absent'); e.code = 'ABSENT'; throw e }
    if (!rep.ok) { const e = new Error('Réseau'); e.code = 'RESEAU'; throw e }
    try { chapitre = await rep.json() } catch { const e = new Error('Réseau'); e.code = 'RESEAU'; throw e }
    cache.set(cle, chapitre)
  }

  const tous = (chapitre.verses ?? []).map((v) => ({ n: v.verse, texte: nettoyer(v.text) }))
  const choisis = ref.debut ? tous.filter((v) => v.n >= ref.debut && v.n <= ref.fin) : tous
  if (choisis.length === 0) { const e = new Error('Absent'); e.code = 'ABSENT'; throw e }
  return { titre: chapitre.name ?? reference, versets: choisis }
}
