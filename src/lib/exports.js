// Exports PDF prêts à l'emploi pour chaque registre (voir exportPdf.js pour la mise en page commune)
import { exporterTableau, exporterDocument, dateFr, fcfa } from './exportPdf.js'

const STATUTS_MEMBRE = { nouveau: 'Nouveau', regulier: 'Régulier', membre_officiel: 'Membre officiel', parti: 'Parti' }
const TYPES_CAISSE = { dime: 'Dîme', collecte: 'Collecte', don: 'Don', depense: 'Dépense' }
const STATUTS_VIREMENT = { declare: 'Déclaré (en attente)', valide: 'Validé', rejete: 'Rejeté' }
const num = (i) => String(i + 1)
const parNom = (a, b) => `${a.nom ?? ''} ${a.prenom ?? ''}`.localeCompare(`${b.nom ?? ''} ${b.prenom ?? ''}`, 'fr')

export function exporterMembres(membres, { eglise, brancheDe } = {}) {
  const liste = [...membres].sort(parNom)
  const colonnes = [
    { titre: 'N°', valeur: (m) => m._n, largeur: 12 },
    { titre: 'Nom', valeur: (m) => m.nom },
    { titre: 'Prénom(s)', valeur: (m) => m.prenom },
    { titre: 'Téléphone', valeur: (m) => m.telephone || '—' },
    { titre: 'Statut', valeur: (m) => STATUTS_MEMBRE[m.statut] ?? m.statut ?? '—' },
    { titre: "Date d'adhésion", valeur: (m) => dateFr(m.dateAdhesion) },
  ]
  if (brancheDe) colonnes.splice(1, 0, { titre: 'Église', valeur: (m) => brancheDe(m) })
  const actifs = liste.filter((m) => m.statut !== 'parti').length
  return exporterTableau({
    titre: 'Registre des membres', eglise, sousTitre: eglise ? undefined : 'Toutes les églises locales',
    colonnes, lignes: liste.map((m, i) => ({ ...m, _n: num(i) })), paysage: !!brancheDe,
    resume: [['Total enregistré', `${liste.length} membre(s)`], ['Membres actifs (hors partis)', String(actifs)]],
    nomFichier: `registre-membres-${eglise ?? 'migc'}`,
  })
}

export function exporterPVs(pvs, { eglise, titre = 'Registre des procès-verbaux', brancheDe } = {}) {
  const liste = [...pvs].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  const colonnes = [
    { titre: 'N°', valeur: (p) => p._n, largeur: 12 },
    { titre: 'Date', valeur: (p) => dateFr(p.date), largeur: 24 },
    { titre: 'Objet', valeur: (p) => p.objet, largeur: 45 },
    { titre: 'Contenu', valeur: (p) => p.contenu || '—' },
  ]
  if (brancheDe) colonnes.splice(2, 0, { titre: 'Église', valeur: (p) => brancheDe(p), largeur: 30 })
  return exporterTableau({ titre, eglise, colonnes, lignes: liste.map((p, i) => ({ ...p, _n: num(i) })), paysage: false,
    resume: [['Nombre de procès-verbaux', String(liste.length)]], nomFichier: `registre-pv-${eglise ?? 'migc'}` })
}

export function exporterUnPV(p, { eglise } = {}) {
  return exporterDocument({
    titre: `Procès-verbal : ${p.objet ?? ''}`, eglise, infos: [['Date de la réunion', dateFr(p.date)]],
    rubriques: [{ titre: 'Contenu', texte: p.contenu || '(Aucun contenu saisi)' }], nomFichier: `pv-${p.date ?? ''}-${p.objet ?? ''}`,
  })
}

export function exporterCourriers(courriers, { eglise, titre = 'Registre du courrier' } = {}) {
  const liste = [...courriers].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  return exporterTableau({
    titre, eglise, colonnes: [
      { titre: 'N°', valeur: (c) => c._n, largeur: 12 },
      { titre: 'Date', valeur: (c) => dateFr(c.date), largeur: 24 },
      { titre: 'Sens', valeur: (c) => (c.sens === 'entrant' ? 'Entrant' : 'Sortant'), largeur: 22 },
      { titre: 'Expéditeur / Destinataire', valeur: (c) => c.expediteur },
      { titre: 'Objet', valeur: (c) => c.objet },
    ],
    lignes: liste.map((c, i) => ({ ...c, _n: num(i) })), resume: [['Nombre de courriers', String(liste.length)]], nomFichier: `registre-courrier-${eglise ?? 'migc'}`,
  })
}

// Journal de caisse : ordre chronologique, avec solde cumulé après chaque écriture
export function exporterJournalCaisse(mouvements, { eglise, titre = 'Journal de caisse', brancheDe } = {}) {
  const t = (m) => (m.date?.toDate ? m.date.toDate().getTime() : new Date(m.date ?? 0).getTime())
  const liste = [...mouvements].sort((a, b) => t(a) - t(b))
  let cumul = 0
  const lignes = liste.map((m, i) => {
    const sortie = m.type === 'depense'
    cumul += sortie ? -m.montant : m.montant
    return { ...m, _n: num(i), _entree: sortie ? '' : fcfa(m.montant), _sortie: sortie ? fcfa(m.montant) : '', _solde: fcfa(cumul) }
  })
  const entrees = liste.filter((m) => m.type !== 'depense').reduce((s, m) => s + m.montant, 0)
  const sorties = liste.filter((m) => m.type === 'depense').reduce((s, m) => s + m.montant, 0)
  const colonnes = [
    { titre: 'N°', valeur: (m) => m._n, largeur: 10 },
    { titre: 'Date', valeur: (m) => dateFr(m.date), largeur: 24 },
    { titre: 'Nature', valeur: (m) => TYPES_CAISSE[m.type] ?? m.type, largeur: 22 },
    { titre: 'Libellé', valeur: (m) => m.description || '—' },
    { titre: 'Entrée', valeur: (m) => m._entree, align: 'right', largeur: 30 },
    { titre: 'Sortie', valeur: (m) => m._sortie, align: 'right', largeur: 30 },
    { titre: 'Solde', valeur: (m) => m._solde, align: 'right', largeur: 32 },
  ]
  if (brancheDe) colonnes.splice(2, 0, { titre: 'Église', valeur: (m) => brancheDe(m), largeur: 32 })
  return exporterTableau({
    titre, eglise, colonnes, lignes, paysage: true,
    resume: [['Total des entrées', fcfa(entrees)], ['Total des sorties', fcfa(sorties)], ['Solde', fcfa(entrees - sorties)]],
    nomFichier: `journal-caisse-${eglise ?? 'migc'}`,
  })
}

export function exporterVirements(virements, { eglise, titre = 'Registre des reversements au BEN', brancheDe } = {}) {
  const dv = (v) => v.dateDeclaration ?? v.date
  const t = (v) => (dv(v)?.toDate ? dv(v).toDate().getTime() : 0)
  const liste = [...virements].sort((a, b) => t(a) - t(b))
  const colonnes = [
    { titre: 'N°', valeur: (v) => v._n, largeur: 12 },
    { titre: 'Date de déclaration', valeur: (v) => dateFr(v.dateDeclaration ?? v.date), largeur: 36 },
    { titre: 'Référence', valeur: (v) => v.reference || '—' },
    { titre: 'Montant', valeur: (v) => fcfa(v.montant), align: 'right', largeur: 36 },
    { titre: 'Statut', valeur: (v) => STATUTS_VIREMENT[v.statut] ?? v.statut, largeur: 40 },
  ]
  if (brancheDe) colonnes.splice(2, 0, { titre: 'Église', valeur: (v) => brancheDe(v) })
  const total = liste.filter((v) => v.statut === 'valide').reduce((s, v) => s + (v.montant || 0), 0)
  return exporterTableau({ titre, eglise, colonnes, lignes: liste.map((v, i) => ({ ...v, _n: num(i) })),
    resume: [['Total des reversements validés', fcfa(total)]], nomFichier: `reversements-${eglise ?? 'migc'}` })
}

// Message / prédication d'un pasteur (quel que soit son statut : brouillon, prêt, prêché)
export function exporterMessage(m, { auteur } = {}) {
  const statuts = { brouillon: 'Brouillon', pret: 'Prêt', preche: 'Prêché' }
  return exporterDocument({
    titre: m.titre || 'Message sans titre', sousTitre: m.theme ? `Thème : ${m.theme}` : undefined,
    infos: [['Auteur', auteur], ['Verset principal', m.versetPrincipal], ['Statut', statuts[m.statut] ?? m.statut]],
    rubriques: [
      { titre: 'Grands points', texte: m.points },
      { titre: 'Notes et explications', texte: m.notes },
      { titre: "Versets d'appui", texte: m.versets },
      { titre: 'Conclusion / Application', texte: m.conclusion },
    ],
    nomFichier: `message-${m.titre ?? 'sans-titre'}`,
  })
}
