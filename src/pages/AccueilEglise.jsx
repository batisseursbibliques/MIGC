import React, { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { fcfa, court, sixMois, salutation, moisCourant, MOIS } from './AccueilComposants.jsx'
import './accueil-eglise.css'

const STATUTS = [['nouveau', 'Nouveaux', '#8FD0F5'], ['regulier', 'Réguliers', '#2E86DE'], ['membre_officiel', 'Membres officiels', '#14509A'], ['parti', 'Partis', '#B9C4D6']]

function Anneau({ part, couleur, children }) {
  const R = 42, C = 2 * Math.PI * R
  return (
    <div className="eg-anneau">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={R} fill="none" stroke="#DCEBF8" strokeWidth="9" />
        {part != null && <circle cx="50" cy="50" r={R} fill="none" stroke={couleur} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${Math.max(0.01, part) * C} ${C}`} transform="rotate(-90 50 50)" />}
      </svg>
      <div className="eg-anneau-centre">{children}</div>
    </div>
  )
}

function Beignet({ items, total }) {
  const R = 38, C = 2 * Math.PI * R
  let decalage = 0
  return (
    <svg viewBox="0 0 100 100" className="eg-beignet" role="img" aria-label="Répartition des membres par statut">
      <circle cx="50" cy="50" r={R} fill="none" stroke="#DCEBF8" strokeWidth="14" />
      {total > 0 && items.filter((i) => i.n > 0).map((i) => {
        const l = (i.n / total) * C
        const el = <circle key={i.label} cx="50" cy="50" r={R} fill="none" stroke={i.couleur} strokeWidth="14"
          strokeDasharray={`${l} ${C - l}`} strokeDashoffset={-decalage} transform="rotate(-90 50 50)" />
        decalage += l; return el
      })}
      <text x="50" y="54" textAnchor="middle" className="eg-beignet-n">{total}</text>
    </svg>
  )
}

export function AccueilPasteur({ profil, branche, mouvements, membres, solde, seuil, depasseSeuil, onNaviguer }) {
  const [cultes, setCultes] = useState([])
  const [virements, setVirements] = useState([])
  useEffect(() => onSnapshot(query(collection(db, 'branches', profil.brancheId, 'cultes'), orderBy('date', 'desc')), (s) => setCultes(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setCultes([])), [profil.brancheId])
  useEffect(() => onSnapshot(collection(db, 'branches', profil.brancheId, 'virements'), (s) => setVirements(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setVirements([])), [profil.brancheId])

  const mois = useMemo(() => sixMois(mouvements), [mouvements])
  const maxMois = Math.max(1, ...mois.flatMap((m) => [m.entrees, m.sorties]))
  const entreesMois = mois[5].entrees
  const du = Math.round(entreesMois * 0.25)
  const vMois = virements.find((v) => v.mois === moisCourant())
  const etatRev = vMois ? (vMois.statut === 'valide' ? 'Validé' : 'Déclaré') : du > 0 ? 'À déclarer' : 'Rien à reverser'
  const actifs = membres.filter((m) => m.statut !== 'parti').length
  const aujourdhui = new Date().toISOString().slice(0, 10)
  const prochain = [...cultes].filter((c) => c.date >= aujourdhui).sort((a, b) => a.date.localeCompare(b.date))[0]
  const parStatut = STATUTS.map(([k, label, couleur]) => ({ label, couleur, n: membres.filter((m) => m.statut === k).length }))
  const alertes = [
    depasseSeuil && { t: 'Le solde dépasse le plafond autorisé', d: `Solde ${fcfa(solde)} pour un plafond de ${fcfa(seuil)} : un reversement vers le BEN est requis.`, p: 'tresorerie' },
    du > 0 && !vMois && { t: 'Reversement de 25 % à déclarer', d: `Montant prévu : ${fcfa(du)}, à déclarer par le trésorier de l'église.`, p: 'tresorerie' },
  ].filter(Boolean)
  const part = seuil ? Math.min(1, Math.max(0, solde / seuil)) : null
  const dateCulte = prochain ? new Date(`${prochain.date}T00:00`) : null
  const direction = branche?.mere && branche?.direction === 'archeveque' ? "Dirigée par l'Archevêque" : branche?.pasteurNom ? `Pasteur : ${branche.pasteurNom}` : null

  return (
    <div className="eg">
      <header className="eg-hero">
        <p className="eg-salut">{profil.archeveque ? `${salutation()}, Archevêque` : `${salutation()}, Pasteur ${profil.nom ?? ''}`}</p>
        <h1>{branche?.nom ?? 'Mon église'}</h1>
        <p className="eg-lieu">
          {branche?.mere && <span className="eg-badge">Église mère</span>}
          {[branche?.ville, direction].filter(Boolean).join(' · ')}
        </p>
      </header>

      <section className={`eg-culte${prochain ? '' : ' eg-culte-vide'}`}>
        {prochain ? (
          <button onClick={() => onNaviguer('cultes')} className="eg-culte-bouton">
            <span className="eg-date"><b>{dateCulte.getDate()}</b><i>{MOIS[dateCulte.getMonth()]}</i></span>
            <span className="eg-culte-texte">
              <small>Prochain culte{prochain.heure ? ` · ${prochain.heure}` : ''}</small>
              <strong>{prochain.theme || 'Programme à préciser'}</strong>
              {prochain.predicateur && <em>{prochain.predicateur}</em>}
            </span>
          </button>
        ) : (
          <button onClick={() => onNaviguer('cultes')} className="eg-culte-bouton">
            <span className="eg-date"><b>+</b><i>culte</i></span>
            <span className="eg-culte-texte"><small>Aucun culte programmé</small><strong>Programmer le prochain culte</strong></span>
          </button>
        )}
      </section>

      <section className="eg-pastilles" aria-label="Chiffres clés">
        <button onClick={() => onNaviguer('secretariat')} className="eg-pastille"><i style={{ background: '#2E86DE' }}>👥</i><b>{actifs}</b><span>membres actifs</span></button>
        <button onClick={() => onNaviguer('tresorerie')} className="eg-pastille"><i style={{ background: '#1E9E6A' }}>💰</i><b>{court(solde)}</b><span>en caisse</span></button>
        <button onClick={() => onNaviguer('tresorerie')} className="eg-pastille"><i style={{ background: '#F2A93B' }}>📥</i><b>{court(entreesMois)}</b><span>entrées du mois</span></button>
        <button onClick={() => onNaviguer('tresorerie')} className={`eg-pastille${etatRev === 'À déclarer' ? ' eg-pastille-alerte' : ''}`}><i style={{ background: '#7B61D9' }}>📤</i><b>{etatRev}</b><span>reversement</span></button>
      </section>

      <section className={`eg-bandeau ${alertes.length ? 'eg-bandeau-alerte' : 'eg-bandeau-ok'}`}>
        {alertes.length === 0 ? <p><b>Tout est en ordre.</b> La caisse est dans les limites autorisées.</p>
          : alertes.map((a) => <button key={a.t} onClick={() => onNaviguer(a.p)}><b>{a.t}</b><span>{a.d}</span></button>)}
      </section>

      <div className="eg-colonnes">
        <section className="eg-carte">
          <h2>La caisse</h2>
          <div className="eg-caisse">
            <Anneau part={part} couleur={depasseSeuil ? '#D64545' : '#1E9E6A'}>
              <b>{court(solde)}</b><small>{seuil ? `sur ${court(seuil)}` : 'FCFA'}</small>
            </Anneau>
            <ul className="eg-faits">
              <li><span>Solde</span><b>{fcfa(solde)}</b></li>
              <li><span>Plafond</span><b>{seuil ? fcfa(seuil) : 'non défini'}</b></li>
              <li><span>25 % à reverser</span><b>{fcfa(du)}</b></li>
            </ul>
          </div>
        </section>

        <section className="eg-carte">
          <h2>Les membres</h2>
          <div className="eg-membres">
            <Beignet items={parStatut} total={membres.length} />
            <ul className="eg-legende">{parStatut.map((i) => <li key={i.label}><i style={{ background: i.couleur }} />{i.label}<b>{i.n}</b></li>)}</ul>
          </div>
        </section>
      </div>

      <section className="eg-carte">
        <h2>Entrées et sorties <small>6 derniers mois</small></h2>
        <div className="eg-barres" role="img" aria-label="Entrées et sorties par mois">
          {mois.map((m) => (
            <div key={m.cle} className="eg-mois">
              <div className="eg-cols">
                <span style={{ height: `${(m.entrees / maxMois) * 100}%` }} className="eg-in" title={`Entrées ${fcfa(m.entrees)}`} />
                <span style={{ height: `${(m.sorties / maxMois) * 100}%` }} className="eg-out" title={`Sorties ${fcfa(m.sorties)}`} />
              </div>
              <small>{m.label}</small>
            </div>
          ))}
        </div>
        <p className="eg-leg"><i className="eg-in" /> Entrées <i className="eg-out" /> Sorties</p>
      </section>

      <nav className="eg-tuiles" aria-label="Accès rapides">
        {[['departements', '🏢', 'Départements'], ['rappels', '🔔', "Rappels"], ['secretariat', '📋', 'Secrétariat'], ['tresorerie', '💼', 'Trésorerie'], ['projets', '📦', 'Projets'], ['messages', '✍️', 'Messages'], ['cultes', '🙏', 'Cultes'], ['evenements', '📅', 'Événements']].map(([p, ic, t]) => (
          <button key={p} onClick={() => onNaviguer(p)}><span>{ic}</span>{t}</button>
        ))}
      </nav>
    </div>
  )
}
