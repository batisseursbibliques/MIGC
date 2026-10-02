import React, { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { LOGO_MIGC } from '../assets/logo-migc.js'
import './tableau-bord.css'

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const STATUTS = [
  ['nouveau', 'Nouveaux', 'var(--tb-ciel)'],
  ['regulier', 'Réguliers', 'var(--tb-bleu)'],
  ['membre_officiel', 'Membres officiels', 'var(--tb-nuit)'],
  ['parti', 'Partis', 'var(--tb-gris)'],
]
const fcfa = (n) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`
const court = (n) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} M` : Math.abs(n) >= 1e3 ? `${Math.round(n / 1e3)} k` : String(Math.round(n)))
const dateMouvement = (m) => (m.date?.toDate ? m.date.toDate() : m.date ? new Date(m.date) : null)

function salutation() {
  const h = new Date().getHours()
  return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'
}

// Charge, église par église, les membres, la caisse et les virements à valider
function useDonneesEglises(branches) {
  const [d, setD] = useState({ pret: false, membres: {}, mouvements: {}, virements: [] })
  const cle = branches.map((b) => b.id).join(',')
  useEffect(() => {
    let annule = false
    async function charger() {
      const membres = {}, mouvements = {}, virements = []
      await Promise.all(branches.map(async (b) => {
        const [m, c, v] = await Promise.allSettled([
          getDocs(collection(db, 'branches', b.id, 'membres')),
          getDocs(collection(db, 'branches', b.id, 'caisse')),
          getDocs(query(collection(db, 'branches', b.id, 'virements'), where('statut', '==', 'declare'))),
        ])
        membres[b.id] = m.status === 'fulfilled' ? m.value.docs.map((x) => x.data()) : []
        mouvements[b.id] = c.status === 'fulfilled' ? c.value.docs.map((x) => x.data()) : []
        if (v.status === 'fulfilled') v.value.docs.forEach((x) => virements.push({ id: x.id, brancheId: b.id, ...x.data() }))
      }))
      if (!annule) setD({ pret: true, membres, mouvements, virements })
    }
    charger()
    return () => { annule = true }
  }, [cle])
  return d
}

function useCompte(nom) {
  const [n, setN] = useState(0)
  useEffect(() => onSnapshot(query(collection(db, nom), where('traite', '==', false)), (s) => setN(s.size), () => setN(0)), [nom])
  return n
}

export default function TableauDeBordNational({ profil, branches, virements: virementsProp, onNaviguer, onValider }) {
  const donnees = useDonneesEglises(branches)
  const prieres = useCompte('demandesPriere')
  const contacts = useCompte('messagesContact')
  const [valides, setValides] = useState([])
  const virements = (virementsProp ?? donnees.virements).filter((v) => !valides.includes(v.id))

  const stats = useMemo(() => {
    const membres = Object.values(donnees.membres).flat()
    const parStatut = Object.fromEntries(STATUTS.map(([k]) => [k, membres.filter((m) => m.statut === k).length]))
    const actifs = membres.length - parStatut.parti
    const maintenant = new Date()
    const mois = Array.from({ length: 6 }, (_, i) => {
      const dt = new Date(maintenant.getFullYear(), maintenant.getMonth() - (5 - i), 1)
      return { cle: `${dt.getFullYear()}-${dt.getMonth()}`, label: MOIS[dt.getMonth()], entrees: 0, sorties: 0 }
    })
    const parEglise = branches.map((b) => {
      const mv = donnees.mouvements[b.id] ?? []
      const solde = mv.reduce((a, m) => (m.type === 'depense' ? a - m.montant : a + m.montant), 0)
      mv.forEach((m) => {
        const dt = dateMouvement(m); if (!dt) return
        const ligne = mois.find((x) => x.cle === `${dt.getFullYear()}-${dt.getMonth()}`)
        if (ligne) m.type === 'depense' ? (ligne.sorties += m.montant) : (ligne.entrees += m.montant)
      })
      return { ...b, solde, nbMembres: (donnees.membres[b.id] ?? []).filter((m) => m.statut !== 'parti').length }
    })
    return { total: membres.length, actifs, parStatut, mois, parEglise, solde: parEglise.reduce((a, e) => a + e.solde, 0) }
  }, [donnees, branches])

  const aTraiter = virements.length + prieres + contacts
  const maxMois = Math.max(1, ...stats.mois.flatMap((m) => [m.entrees, m.sorties]))
  const aujourdhui = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="tb">
      <header className="tb-accueil">
        <img src={LOGO_MIGC} alt="" className="tb-sceau" />
        <p className="tb-date">{aujourdhui}</p>
        <h1>{salutation()}, {profil?.role === 'national' ? 'Archevêque' : (profil?.nom ?? '')}.</h1>
        <p className="tb-devise">Manifester la gloire de Christ à toutes les nations.</p>
      </header>

      <section className="tb-chiffres" aria-label="Chiffres clés">
        <button onClick={() => onNaviguer('branches')} className="tb-chiffre">
          <span className="tb-n">{branches.length}</span><span className="tb-l">{branches.length > 1 ? 'Églises locales' : 'Église locale'}</span>
        </button>
        <button onClick={() => onNaviguer('branches')} className="tb-chiffre">
          <span className="tb-n">{donnees.pret ? stats.actifs : '…'}</span><span className="tb-l">Membres actifs</span>
        </button>
        <button onClick={() => onNaviguer('rapports')} className="tb-chiffre tb-large">
          <span className="tb-n">{donnees.pret ? fcfa(stats.solde) : '…'}</span><span className="tb-l">Solde cumulé des caisses</span>
        </button>
        <button onClick={() => onNaviguer('branches')} className={`tb-chiffre${virements.length ? ' tb-alerte' : ''}`}>
          <span className="tb-n">{virements.length}</span><span className="tb-l">{virements.length > 1 ? 'Reversements à valider' : 'Reversement à valider'}</span>
        </button>
      </section>

      <div className="tb-grille">
        <section className="tb-bloc tb-pleine">
          <h2>À traiter {aTraiter > 0 && <span className="tb-pastille">{aTraiter}</span>}</h2>
          {aTraiter === 0 && <p className="tb-vide">Rien en attente. Tout est à jour.</p>}
          {virements.map((v) => (
            <div key={v.id} className="tb-ligne">
              <div><strong>{branches.find((b) => b.id === v.brancheId)?.nom ?? 'Église'}</strong><small>Reversement de {fcfa(v.montant)}{v.reference ? ` · réf. ${v.reference}` : ''}</small></div>
              <button className="tb-bouton" onClick={() => onValider(v).then(() => setValides((x) => [...x, v.id]))}>Valider</button>
            </div>
          ))}
          {prieres > 0 && (
            <button className="tb-ligne tb-lien" onClick={() => onNaviguer('site')}>
              <div><strong>{prieres} demande{prieres > 1 ? 's' : ''} de prière</strong><small>Reçue{prieres > 1 ? 's' : ''} depuis le site public</small></div><span aria-hidden="true">›</span>
            </button>
          )}
          {contacts > 0 && (
            <button className="tb-ligne tb-lien" onClick={() => onNaviguer('site')}>
              <div><strong>{contacts} message{contacts > 1 ? 's' : ''} de contact</strong><small>À lire et à traiter</small></div><span aria-hidden="true">›</span>
            </button>
          )}
        </section>

        <section className="tb-bloc">
          <h2>Entrées et sorties, 6 derniers mois</h2>
          <div className="tb-barres" role="img" aria-label="Entrées et sorties des caisses par mois">
            {stats.mois.map((m) => (
              <div key={m.cle} className="tb-mois">
                <div className="tb-colonnes">
                  <span className="tb-barre tb-entree" style={{ height: `${(m.entrees / maxMois) * 100}%` }} title={`Entrées ${fcfa(m.entrees)}`} />
                  <span className="tb-barre tb-sortie" style={{ height: `${(m.sorties / maxMois) * 100}%` }} title={`Sorties ${fcfa(m.sorties)}`} />
                </div>
                <small>{m.label}</small>
                <small className="tb-val">{court(m.entrees)}</small>
              </div>
            ))}
          </div>
          <p className="tb-legende"><i className="tb-pt tb-entree" /> Entrées <i className="tb-pt tb-sortie" /> Sorties</p>
        </section>

        <section className="tb-bloc">
          <h2>Membres</h2>
          <p className="tb-gros">{donnees.pret ? stats.total : '…'} <small>enregistrés</small></p>
          <div className="tb-empile" role="img" aria-label="Répartition des membres par statut">
            {STATUTS.map(([k, , c]) => stats.total > 0 && <span key={k} style={{ flex: stats.parStatut[k], background: c }} />)}
          </div>
          <ul className="tb-repartition">
            {STATUTS.map(([k, l, c]) => <li key={k}><i className="tb-pt" style={{ background: c }} />{l}<b>{stats.parStatut[k]}</b></li>)}
          </ul>
        </section>

        <section className="tb-bloc tb-pleine">
          <h2>Les églises</h2>
          {branches.length === 0 && (
            <p className="tb-vide">Aucune église enregistrée. <button className="tb-texte" onClick={() => onNaviguer('branches')}>Ajouter la première église</button></p>
          )}
          {stats.parEglise.map((e) => {
            const part = e.seuilSolde ? Math.min(100, Math.max(0, (e.solde / e.seuilSolde) * 100)) : 0
            return (
              <button key={e.id} className="tb-eglise" onClick={() => onNaviguer('branches')}>
                <div><strong>{e.nom}</strong><small>{e.ville}{e.pasteurNom ? ` · ${e.pasteurNom}` : ''}</small></div>
                <div className="tb-eglise-chiffres"><b>{e.nbMembres}</b><small>membres</small></div>
                <div className="tb-eglise-chiffres"><b>{court(e.solde)}</b><small>en caisse</small>
                  {e.seuilSolde > 0 && <span className="tb-jauge"><span style={{ width: `${part}%` }} className={part >= 100 ? 'tb-plein' : ''} /></span>}
                </div>
              </button>
            )
          })}
        </section>
      </div>

      <nav className="tb-acces" aria-label="Accès rapides">
        {[['utilisateurs', 'Comptes'], ['rapports', 'Rapports financiers'], ['projets', 'Projets du BEN'], ['communication', 'Communication'], ['messages', 'Messages'], ['site', 'Site public']].map(([p, t]) => (
          <button key={p} onClick={() => onNaviguer(p)}>{t}</button>
        ))}
      </nav>
    </div>
  )
}
