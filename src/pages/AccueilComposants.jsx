import React from 'react'
import { LOGO_MIGC } from '../assets/logo-migc.js'
import './tableau-bord.css'

export const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
export const fcfa = (n) => `${Math.round(n || 0).toLocaleString('fr-FR')} FCFA`
export const court = (n) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} M` : Math.abs(n) >= 1e3 ? `${Math.round(n / 1e3)} k` : String(Math.round(n || 0)))
export const dateMvt = (m) => (m.date?.toDate ? m.date.toDate() : m.date ? new Date(m.date) : null)
export const dateCourte = (v) => { const d = v?.toDate ? v.toDate() : /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? new Date(`${v}T00:00`) : v ? new Date(v) : null; return d && !isNaN(d) ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' }
export const salutation = () => { const h = new Date().getHours(); return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir' }
export const moisCourant = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }

// Entrées / sorties des 6 derniers mois à partir d'une liste de mouvements de caisse
export function sixMois(mouvements) {
  const now = new Date()
  const mois = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { cle: `${d.getFullYear()}-${d.getMonth()}`, label: MOIS[d.getMonth()], entrees: 0, sorties: 0 }
  })
  mouvements.forEach((m) => {
    const d = dateMvt(m); if (!d) return
    const l = mois.find((x) => x.cle === `${d.getFullYear()}-${d.getMonth()}`)
    if (l) (m.type === 'depense' ? (l.sorties += m.montant) : (l.entrees += m.montant))
  })
  return mois
}

export function Entete({ titre, sous }) {
  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <header className="tb-accueil">
      <img src={LOGO_MIGC} alt="" className="tb-sceau" />
      <p className="tb-date">{date}</p>
      <h1>{titre}</h1>
      {sous && <p className="tb-devise">{sous}</p>}
    </header>
  )
}

export function Chiffres({ children }) { return <section className="tb-chiffres" aria-label="Chiffres clés">{children}</section> }
export function Chiffre({ valeur, label, onClick, alerte, large }) {
  return (
    <button onClick={onClick} className={`tb-chiffre${alerte ? ' tb-alerte' : ''}${large ? ' tb-large' : ''}`}>
      <span className="tb-n">{valeur}</span><span className="tb-l">{label}</span>
    </button>
  )
}
export function Grille({ children }) { return <div className="tb-grille">{children}</div> }
export function Bloc({ titre, pleine, pastille, children }) {
  return (
    <section className={`tb-bloc${pleine ? ' tb-pleine' : ''}`}>
      <h2>{titre} {pastille > 0 && <span className="tb-pastille">{pastille}</span>}</h2>
      {children}
    </section>
  )
}
export function Vide({ children }) { return <p className="tb-vide">{children}</p> }
export function Ligne({ titre, detail, onClick, droite }) {
  const contenu = (<><div><strong>{titre}</strong>{detail && <small>{detail}</small>}</div>{droite ?? (onClick && <span aria-hidden="true">›</span>)}</>)
  return onClick ? <button className="tb-ligne tb-lien" onClick={onClick}>{contenu}</button> : <div className="tb-ligne">{contenu}</div>
}

export function Barres({ mois, label = 'Entrées et sorties par mois' }) {
  const max = Math.max(1, ...mois.flatMap((m) => [m.entrees, m.sorties]))
  return (
    <>
      <div className="tb-barres" role="img" aria-label={label}>
        {mois.map((m) => (
          <div key={m.cle} className="tb-mois">
            <div className="tb-colonnes">
              <span className="tb-barre tb-entree" style={{ height: `${(m.entrees / max) * 100}%` }} title={`Entrées ${fcfa(m.entrees)}`} />
              <span className="tb-barre tb-sortie" style={{ height: `${(m.sorties / max) * 100}%` }} title={`Sorties ${fcfa(m.sorties)}`} />
            </div>
            <small>{m.label}</small><small className="tb-val">{court(m.entrees)}</small>
          </div>
        ))}
      </div>
      <p className="tb-legende"><i className="tb-pt tb-entree" /> Entrées <i className="tb-pt tb-sortie" /> Sorties</p>
    </>
  )
}

export function Repartition({ items, total }) {
  return (
    <>
      <div className="tb-empile" role="img" aria-label="Répartition">
        {total > 0 && items.map((it) => <span key={it.label} style={{ flex: it.n, background: it.couleur }} />)}
      </div>
      <ul className="tb-repartition">
        {items.map((it) => <li key={it.label}><i className="tb-pt" style={{ background: it.couleur }} />{it.label}<b>{it.n}</b></li>)}
      </ul>
    </>
  )
}
export const COULEURS_STATUT = [['nouveau', 'Nouveaux', 'var(--tb-ciel)'], ['regulier', 'Réguliers', 'var(--tb-bleu)'], ['membre_officiel', 'Membres officiels', 'var(--tb-nuit)'], ['parti', 'Partis', 'var(--tb-gris)']]

export function Acces({ liens, onNaviguer }) {
  return (
    <nav className="tb-acces" aria-label="Accès rapides">
      {liens.map(([p, t]) => <button key={p} onClick={() => onNaviguer(p)}>{t}</button>)}
    </nav>
  )
}
