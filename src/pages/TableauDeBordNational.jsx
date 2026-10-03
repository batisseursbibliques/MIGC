import React, { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { LOGO_MIGC } from '../assets/logo-migc.js'
import { fcfa, court, sixMois, salutation, moisCourant, dateMvt, dateCourte, MOIS } from './AccueilComposants.jsx'
import './presidence.css'

const STATUTS = [['nouveau', 'Nouveaux', '#9FB0F2'], ['regulier', 'Réguliers', '#4A5FD0'], ['membre_officiel', 'Membres officiels', '#1A2478'], ['parti', 'Partis', '#C3C8DA']]
const NATURE = { dime: 'Dîme', collecte: 'Collecte', don: 'Don', depense: 'Dépense' }

// Charge, église par église : membres, caisse et reversements
function useDonneesEglises(branches) {
  const [d, setD] = useState({ pret: false, membres: {}, mouvements: {}, virements: {} })
  const cle = branches.map((b) => b.id).join(',')
  useEffect(() => {
    let annule = false
    async function charger() {
      const membres = {}, mouvements = {}, virements = {}
      await Promise.all(branches.map(async (b) => {
        const [m, c, v] = await Promise.allSettled([
          getDocs(collection(db, 'branches', b.id, 'membres')),
          getDocs(collection(db, 'branches', b.id, 'caisse')),
          getDocs(collection(db, 'branches', b.id, 'virements')),
        ])
        membres[b.id] = m.status === 'fulfilled' ? m.value.docs.map((x) => x.data()) : []
        mouvements[b.id] = c.status === 'fulfilled' ? c.value.docs.map((x) => x.data()) : []
        virements[b.id] = v.status === 'fulfilled' ? v.value.docs.map((x) => ({ id: x.id, brancheId: b.id, ...x.data() })) : []
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

const aRejoint = (m, mois) => { const v = m.dateAdhesion; const s = v?.toDate ? v.toDate().toISOString().slice(0, 7) : String(v ?? '').slice(0, 7); return s === mois }

export default function TableauDeBordNational({ profil, branches, onNaviguer, onValider }) {
  const donnees = useDonneesEglises(branches)
  const prieres = useCompte('demandesPriere')
  const contacts = useCompte('messagesContact')
  const [valides, setValides] = useState([])
  const mc = moisCourant()

  const s = useMemo(() => {
    const membres = Object.values(donnees.membres).flat()
    const mouvements = branches.flatMap((b) => (donnees.mouvements[b.id] ?? []).map((m) => ({ ...m, eglise: b.nom })))
    const mois = sixMois(mouvements)
    const [prec, cur] = [mois[4], mois[5]]
    const delta = prec.entrees > 0 ? Math.round(((cur.entrees - prec.entrees) / prec.entrees) * 100) : null
    const parStatut = STATUTS.map(([k, label, couleur]) => ({ label, couleur, n: membres.filter((m) => m.statut === k).length }))
    const parEglise = branches.map((b) => {
      const mv = donnees.mouvements[b.id] ?? []
      const solde = mv.reduce((a, m) => (m.type === 'depense' ? a - m.montant : a + m.montant), 0)
      const entreesMois = mois.length ? mv.filter((m) => { const d = dateMvt(m); return d && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === mc && m.type !== 'depense' }).reduce((a, m) => a + m.montant, 0) : 0
      const vir = (donnees.virements[b.id] ?? []).find((v) => v.mois === mc)
      const du = Math.round(entreesMois * 0.25)
      const etat = vir ? (vir.statut === 'valide' ? 'valide' : 'declare') : du > 0 ? 'adeclarer' : 'rien'
      return { ...b, solde, du, etat, nb: (donnees.membres[b.id] ?? []).filter((m) => m.statut !== 'parti').length }
    }).sort((a, b) => (b.mere ? 1 : 0) - (a.mere ? 1 : 0))
    const attente = Object.values(donnees.virements).flat().filter((v) => v.statut === 'declare' && !valides.includes(v.id))
    const recents = [...mouvements].filter((m) => dateMvt(m)).sort((a, b) => dateMvt(b) - dateMvt(a)).slice(0, 6)
    return { total: membres.length, actifs: membres.length - parStatut[3].n, nouveaux: membres.filter((m) => aRejoint(m, mc)).length, parStatut, mois, cur, delta, parEglise, attente, recents, solde: parEglise.reduce((a, e) => a + e.solde, 0) }
  }, [donnees, branches, valides, mc])

  const nomEglise = (id) => branches.find((b) => b.id === id)?.nom ?? 'Église'
  const aTraiter = s.attente.length + prieres + contacts
  const mere = branches.find((b) => b.mere)
  const max = Math.max(1, ...s.mois.flatMap((m) => [m.entrees, m.sorties]))
  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const pret = donnees.pret

  return (
    <div className="pr">
      <header className="pr-hero">
        <img src={LOGO_MIGC} alt="" className="pr-sceau" />
        <p className="pr-date">{date}</p>
        <h1>{salutation()}, Archevêque.</h1>
        <p className="pr-devise">Manifester la gloire de Christ à toutes les nations.</p>
        <div className="pr-verre" role="group" aria-label="Chiffres clés de la Mission">
          <button onClick={() => onNaviguer('branches')}><b>{branches.length}</b><span>{branches.length > 1 ? 'églises' : 'église'}</span></button>
          <button onClick={() => onNaviguer('branches')}><b>{pret ? s.actifs : '…'}</b><span>membres actifs</span>{pret && s.nouveaux > 0 && <em>+{s.nouveaux} ce mois</em>}</button>
          <button onClick={() => onNaviguer('rapports')} className="pr-large"><b>{pret ? fcfa(s.solde) : '…'}</b><span>solde cumulé des caisses</span></button>
          <button onClick={() => onNaviguer('rapports')}><b>{pret ? court(s.cur.entrees) : '…'}</b><span>entrées du mois</span>{s.delta != null && <em className={s.delta >= 0 ? 'pr-hausse' : 'pr-baisse'}>{s.delta >= 0 ? '▲' : '▼'} {Math.abs(s.delta)} %</em>}</button>
        </div>
      </header>

      <section className={`pr-action ${aTraiter ? 'pr-action-oui' : 'pr-action-non'}`}>
        <h2>{aTraiter ? <>À traiter <span className="pr-pastille">{aTraiter}</span></> : 'Tout est à jour'}</h2>
        {aTraiter === 0 && <p>Aucun reversement ni message en attente. Que la grâce du Seigneur vous accompagne aujourd'hui.</p>}
        {s.attente.map((v) => (
          <div key={v.id} className="pr-ligne">
            <div><strong>{nomEglise(v.brancheId)}</strong><small>Reversement de {fcfa(v.montant)}{v.reference ? ` · réf. ${v.reference}` : ''}</small></div>
            <button className="pr-valider" onClick={() => (onValider ? onValider(v) : Promise.resolve()).then(() => setValides((x) => [...x, v.id]))}>Valider</button>
          </div>
        ))}
        {prieres > 0 && <button className="pr-ligne pr-lien" onClick={() => onNaviguer('site')}><div><strong>{prieres} demande{prieres > 1 ? 's' : ''} de prière</strong><small>Reçue{prieres > 1 ? 's' : ''} depuis le site public</small></div><span>›</span></button>}
        {contacts > 0 && <button className="pr-ligne pr-lien" onClick={() => onNaviguer('site')}><div><strong>{contacts} message{contacts > 1 ? 's' : ''} de contact</strong><small>À lire et à traiter</small></div><span>›</span></button>}
      </section>

      {mere && (
        <button className="pr-mere" onClick={() => onNaviguer('mere:supervision')}>
          <span className="pr-mere-ic">⛪</span>
          <span><small>{mere.direction === 'pasteur' ? 'Église mère · supervision' : 'Église mère · vous la dirigez'}</small><strong>{mere.nom}</strong></span>
          <span className="pr-fleche">›</span>
        </button>
      )}

      <div className="pr-colonnes">
        <section className="pr-carte">
          <h2>Reversements du mois <small>25 % des entrées</small></h2>
          {s.parEglise.length === 0 && <p className="pr-vide">Aucune église enregistrée.</p>}
          {s.parEglise.map((e) => (
            <div key={e.id} className="pr-rev">
              <div><strong>{e.nom}</strong><small>{e.du > 0 ? `À reverser : ${fcfa(e.du)}` : 'Aucune entrée ce mois'}</small></div>
              <span className={`pr-chip pr-${e.etat}`}>{{ valide: 'Reçu', declare: 'Déclaré', adeclarer: 'À déclarer', rien: '—' }[e.etat]}</span>
            </div>
          ))}
        </section>

        <section className="pr-carte">
          <h2>Entrées et sorties <small>6 derniers mois</small></h2>
          <div className="pr-barres" role="img" aria-label="Entrées et sorties par mois">
            {s.mois.map((m) => (
              <div key={m.cle} className="pr-mois">
                <div className="pr-cols">
                  <span className="pr-in" style={{ height: `${(m.entrees / max) * 100}%` }} title={`Entrées ${fcfa(m.entrees)}`} />
                  <span className="pr-out" style={{ height: `${(m.sorties / max) * 100}%` }} title={`Sorties ${fcfa(m.sorties)}`} />
                </div>
                <small>{m.label}</small><small className="pr-val">{court(m.entrees)}</small>
              </div>
            ))}
          </div>
          <p className="pr-leg"><i className="pr-in" /> Entrées <i className="pr-out" /> Sorties</p>
        </section>

        <section className="pr-carte">
          <h2>Les membres <small>{s.total} enregistrés</small></h2>
          <div className="pr-empile" role="img" aria-label="Répartition des membres">{s.total > 0 && s.parStatut.map((i) => <span key={i.label} style={{ flex: i.n || 0, background: i.couleur }} />)}</div>
          <ul className="pr-legende">{s.parStatut.map((i) => <li key={i.label}><i style={{ background: i.couleur }} />{i.label}<b>{i.n}</b></li>)}</ul>
        </section>

        <section className="pr-carte">
          <h2>Activité récente <small>toutes les caisses</small></h2>
          {s.recents.length === 0 && <p className="pr-vide">Aucun mouvement de caisse enregistré.</p>}
          {s.recents.map((m, i) => (
            <div key={i} className="pr-act">
              <span className={`pr-fleche-act ${m.type === 'depense' ? 'pr-sortie' : 'pr-entree'}`}>{m.type === 'depense' ? '↗' : '↙'}</span>
              <div><strong>{m.description || NATURE[m.type] || 'Mouvement'}</strong><small>{m.eglise} · {dateCourte(m.date)}</small></div>
              <b className={m.type === 'depense' ? 'pr-neg' : 'pr-pos'}>{m.type === 'depense' ? '−' : '+'}{court(m.montant)}</b>
            </div>
          ))}
        </section>
      </div>

      <section className="pr-eglises">
        <h2>Les églises</h2>
        {s.parEglise.length === 0 && <p className="pr-vide">Aucune église enregistrée. <button className="pr-texte" onClick={() => onNaviguer('branches')}>Créer la première église</button></p>}
        <div className="pr-grille">
          {s.parEglise.map((e) => {
            const part = e.seuilSolde ? Math.min(100, Math.max(0, (e.solde / e.seuilSolde) * 100)) : 0
            return (
              <button key={e.id} className="pr-egl" onClick={() => onNaviguer('branches')}>
                <div className="pr-egl-tete"><strong>{e.nom}</strong>{e.mere && <span className="pr-badge">mère</span>}</div>
                <small>{[e.ville, e.mere && e.direction === 'archeveque' ? "Archevêque" : e.pasteurNom].filter(Boolean).join(' · ') || 'Sans pasteur nommé'}</small>
                <div className="pr-egl-chiffres"><span><b>{e.nb}</b> membres</span><span><b>{court(e.solde)}</b> en caisse</span></div>
                {e.seuilSolde > 0 && <span className="pr-jauge"><span style={{ width: `${part}%` }} className={part >= 100 ? 'pr-plein' : ''} /></span>}
              </button>
            )
          })}
        </div>
      </section>

      <nav className="pr-tuiles" aria-label="Accès rapides">
        {[['utilisateurs', '👤', 'Comptes'], ['rapports', '📊', 'Rapports'], ['projets', '📦', 'Projets du BEN'], ['communication', '📣', 'Communication'], ['messages', '✍️', 'Messages'], ['site', '🌐', 'Site public']].map(([p, ic, t]) => (
          <button key={p} onClick={() => onNaviguer(p)}><span>{ic}</span>{t}</button>
        ))}
      </nav>
    </div>
  )
}
