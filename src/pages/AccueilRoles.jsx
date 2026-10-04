import React, { useEffect, useMemo, useState } from 'react'
import { collection, collectionGroup, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { LOGO_MIGC } from '../assets/logo-migc.js'
import './presidence.css'
import { Entete, Chiffres, Chiffre, Grille, Bloc, Vide, Ligne, Barres, Repartition, Acces, COULEURS_STATUT, fcfa, sixMois, dateMvt, dateCourte, salutation, moisCourant, court } from './AccueilComposants.jsx'

const ecoute = (ref, set, avec = (d) => d) => onSnapshot(ref, (s) => set(s.docs.map((d) => avec({ id: d.id, ...d.data() }, d))), () => set([]))
const soldeDe = (mv) => mv.reduce((a, m) => (m.type === 'depense' ? a - m.montant : a + m.montant), 0)

// ── Éléments communs au style « présidence » (bleu nuit et or) ───────────────
const dateLongue = () => new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const STAT_COUL = { nouveau: '#9FB0F2', regulier: '#4A5FD0', membre_officiel: '#1A2478', parti: '#C3C8DA' }
const STAT_LAB = { nouveau: 'Nouveaux', regulier: 'Réguliers', membre_officiel: 'Membres officiels', parti: 'Partis' }

function Hero({ titre, sous, children }) {
  return (
    <header className="pr-hero">
      <img src={LOGO_MIGC} alt="" className="pr-sceau" />
      <p className="pr-date">{dateLongue()}</p>
      <h1>{titre}</h1>
      <p className="pr-devise">{sous}</p>
      <div className="pr-verre" role="group" aria-label="Chiffres clés">{children}</div>
    </header>
  )
}
const Verre = ({ valeur, label, onClick, large, note }) => (
  <button onClick={onClick} className={large ? 'pr-large' : ''}><b>{valeur}</b><span>{label}</span>{note}</button>
)
const Carte = ({ titre, petit, children }) => (
  <section className="pr-carte"><h2>{titre} {petit && <small>{petit}</small>}</h2>{children}</section>
)
const Tuiles = ({ liens, onNaviguer }) => (
  <nav className="pr-tuiles" aria-label="Accès rapides">{liens.map(([p, ic, t]) => <button key={p} onClick={() => onNaviguer(p)}><span>{ic}</span>{t}</button>)}</nav>
)
const Repart = ({ membres }) => {
  const items = Object.keys(STAT_LAB).map((k) => ({ k, n: membres.filter((m) => m.statut === k).length }))
  return (
    <>
      <div className="pr-empile" role="img" aria-label="Répartition des membres">{membres.length > 0 && items.map((i) => <span key={i.k} style={{ flex: i.n, background: STAT_COUL[i.k] }} />)}</div>
      <ul className="pr-legende">{items.map((i) => <li key={i.k}><i style={{ background: STAT_COUL[i.k] }} />{STAT_LAB[i.k]}<b>{i.n}</b></li>)}</ul>
    </>
  )
}
const CartesEglises = ({ lignes, onClick }) => (
  <section className="pr-eglises">
    <h2>Les églises</h2>
    {lignes.length === 0 && <p className="pr-vide">Aucune église enregistrée.</p>}
    <div className="pr-grille">
      {lignes.map((e) => (
        <button key={e.id} className="pr-egl" onClick={onClick}>
          <div className="pr-egl-tete"><strong>{e.nom}</strong>{e.mere && <span className="pr-badge">mère</span>}</div>
          <small>{[e.ville, e.mere && e.direction === 'archeveque' ? 'Archevêque' : e.pasteurNom].filter(Boolean).join(' · ') || 'Sans pasteur nommé'}</small>
          <div className="pr-egl-chiffres">{e.chiffres}</div>
        </button>
      ))}
    </div>
  </section>
)

// ── Secrétaire Général ───────────────────────────────────────────────────────
export function AccueilSG({ profil, onNaviguer }) {
  const [branches, setBranches] = useState([]); const [membres, setMembres] = useState([])
  const [pvBen, setPvBen] = useState([]); const [courriers, setCourriers] = useState([]); const [pvEglises, setPvEglises] = useState([])
  useEffect(() => ecoute(collection(db, 'branches'), setBranches), [])
  useEffect(() => ecoute(collectionGroup(db, 'membres'), setMembres, (d, s) => ({ ...d, brancheId: s.ref.parent.parent.id })), [])
  useEffect(() => ecoute(query(collection(db, 'pvNationaux'), orderBy('date', 'desc')), setPvBen), [])
  useEffect(() => ecoute(query(collection(db, 'courrierNational'), orderBy('date', 'desc')), setCourriers), [])
  useEffect(() => ecoute(collectionGroup(db, 'pv'), setPvEglises), [])
  const actifs = membres.filter((m) => m.statut !== 'parti').length
  const mc = moisCourant(); const duMois = courriers.filter((c) => String(c.date).startsWith(mc)).length
  const entrants = courriers.filter((c) => c.sens === 'entrant').length
  const lignes = [...branches].sort((a, b) => (b.mere ? 1 : 0) - (a.mere ? 1 : 0)).map((b) => ({ ...b, chiffres: <><span><b>{membres.filter((m) => m.brancheId === b.id && m.statut !== 'parti').length}</b> membres</span><span><b>{pvEglises.filter((p) => p.brancheId === b.id).length || '—'}</b> PV</span></> }))
  return (
    <div className="pr">
      <Hero titre={`${salutation()}, ${profil.nom ?? 'Secrétaire Général'}.`} sous="Secrétariat Général du Bureau Exécutif National">
        <Verre valeur={branches.length} label={branches.length > 1 ? 'églises locales' : 'église locale'} onClick={() => onNaviguer('rapportsBranches')} />
        <Verre valeur={actifs} label="membres actifs" onClick={() => onNaviguer('membres')} />
        <Verre valeur={pvBen.length} label="PV du BEN" onClick={() => onNaviguer('pv')} />
        <Verre valeur={duMois} label="courriers ce mois-ci" onClick={() => onNaviguer('courrier')} />
      </Hero>
      <div className="pr-colonnes">
        <Carte titre="Derniers procès-verbaux du BEN" petit={`${pvBen.length} au total`}>
          {pvBen.length === 0 && <p className="pr-vide">Aucun procès-verbal enregistré.</p>}
          {pvBen.slice(0, 4).map((p) => <button key={p.id} className="pr-ligne pr-lien" onClick={() => onNaviguer('pv')}><div><strong>{p.objet}</strong><small>{dateCourte(p.date)}</small></div><span>›</span></button>)}
        </Carte>
        <Carte titre="Derniers courriers" petit={`${entrants} reçu(s) au total`}>
          {courriers.length === 0 && <p className="pr-vide">Aucun courrier enregistré.</p>}
          {courriers.slice(0, 4).map((c) => <button key={c.id} className="pr-ligne pr-lien" onClick={() => onNaviguer('courrier')}><div><strong>{c.objet}</strong><small>{c.sens === 'entrant' ? 'Reçu de' : 'Envoyé à'} {c.expediteur} · {dateCourte(c.date)}</small></div><span>›</span></button>)}
        </Carte>
        <Carte titre="Les membres" petit={`${membres.length} enregistrés`}><Repart membres={membres} /></Carte>
        <Carte titre="Procès-verbaux des églises" petit="reçus au Secrétariat">
          <p className="pr-vide" style={{ marginBottom: '.6rem' }}>{pvEglises.length === 0 ? "Aucun procès-verbal d'église reçu." : `${pvEglises.length} procès-verbal(aux) reçu(s) des églises locales.`}</p>
          <button className="pr-texte" onClick={() => onNaviguer('rapportsBranches')}>Consulter et exporter</button>
        </Carte>
      </div>
      <CartesEglises lignes={lignes} onClick={() => onNaviguer('rapportsBranches')} />
      <Tuiles onNaviguer={onNaviguer} liens={[['membres', '👥', 'Registre des membres'], ['pv', '📋', 'PV du BEN'], ['courrier', '✉️', 'Courrier du BEN'], ['rapportsBranches', '🏛️', 'PV des églises']]} />
    </div>
  )
}

// ── Trésorière Générale ──────────────────────────────────────────────────────
export function AccueilTG({ profil, onNaviguer }) {
  const [branches, setBranches] = useState([]); const [mouvements, setMouvements] = useState([]); const [virements, setVirements] = useState([])
  useEffect(() => ecoute(collection(db, 'branches'), setBranches), [])
  useEffect(() => ecoute(collectionGroup(db, 'caisse'), setMouvements, (d, s) => ({ ...d, brancheId: s.ref.parent.parent.id })), [])
  useEffect(() => ecoute(collectionGroup(db, 'virements'), setVirements, (d, s) => ({ ...d, brancheId: s.ref.parent.parent.id })), [])
  const mc = moisCourant()
  const mois = useMemo(() => sixMois(mouvements), [mouvements])
  const max = Math.max(1, ...mois.flatMap((m) => [m.entrees, m.sorties]))
  const attente = virements.filter((v) => v.statut === 'declare')
  const recu = virements.filter((v) => v.statut === 'valide').reduce((a, v) => a + (v.montant || 0), 0)
  const nom = (id) => branches.find((b) => b.id === id)?.nom ?? id
  const duMois = (id) => Math.round(mouvements.filter((m) => m.brancheId === id && m.type !== 'depense').filter((m) => { const d = dateMvt(m); return d && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === mc }).reduce((a, m) => a + m.montant, 0) * 0.25)
  const parEglise = [...branches].sort((a, b) => (b.mere ? 1 : 0) - (a.mere ? 1 : 0)).map((b) => {
    const du = duMois(b.id); const v = virements.find((x) => x.brancheId === b.id && x.mois === mc)
    return { ...b, solde: soldeDe(mouvements.filter((m) => m.brancheId === b.id)), du, etat: v ? (v.statut === 'valide' ? 'valide' : 'declare') : du > 0 ? 'adeclarer' : 'rien' }
  })
  const recents = [...mouvements].filter((m) => dateMvt(m)).sort((a, b) => dateMvt(b) - dateMvt(a)).slice(0, 6)
  const lignes = parEglise.map((e) => ({ ...e, chiffres: <span><b>{court(e.solde)}</b> en caisse</span> }))
  return (
    <div className="pr">
      <Hero titre={`${salutation()}, ${profil.nom ?? 'Trésorière Générale'}.`} sous="Trésorerie Générale du Bureau Exécutif National">
        <Verre large valeur={fcfa(soldeDe(mouvements))} label="solde cumulé des caisses" onClick={() => onNaviguer('consolidation')} />
        <Verre valeur={fcfa(recu)} label="reversements reçus" onClick={() => onNaviguer('virements')} />
        <Verre valeur={attente.length} label={attente.length > 1 ? 'à valider' : 'à valider'} onClick={() => onNaviguer('virements')} />
      </Hero>
      <section className={`pr-action ${attente.length ? 'pr-action-oui' : 'pr-action-non'}`}>
        <h2>{attente.length ? <>À valider <span className="pr-pastille">{attente.length}</span></> : 'Tout est à jour'}</h2>
        {attente.length === 0 && <p>Aucun reversement en attente de validation.</p>}
        {attente.map((v) => <button key={v.id} className="pr-ligne pr-lien" onClick={() => onNaviguer('virements')}><div><strong>{nom(v.brancheId)}</strong><small>{fcfa(v.montant)}{v.reference ? ` · réf. ${v.reference}` : ''}</small></div><span>›</span></button>)}
      </section>
      <div className="pr-colonnes">
        <Carte titre="Reversements du mois" petit="25 % des entrées">
          {parEglise.length === 0 && <p className="pr-vide">Aucune église enregistrée.</p>}
          {parEglise.map((e) => (
            <div key={e.id} className="pr-rev"><div><strong>{e.nom}</strong><small>{e.du > 0 ? `À reverser : ${fcfa(e.du)}` : 'Aucune entrée ce mois'}</small></div>
              <span className={`pr-chip pr-${e.etat}`}>{{ valide: 'Reçu', declare: 'Déclaré', adeclarer: 'À déclarer', rien: '—' }[e.etat]}</span></div>
          ))}
        </Carte>
        <Carte titre="Entrées et sorties" petit="6 derniers mois">
          <div className="pr-barres" role="img" aria-label="Entrées et sorties par mois">
            {mois.map((m) => (
              <div key={m.cle} className="pr-mois"><div className="pr-cols">
                <span className="pr-in" style={{ height: `${(m.entrees / max) * 100}%` }} title={`Entrées ${fcfa(m.entrees)}`} />
                <span className="pr-out" style={{ height: `${(m.sorties / max) * 100}%` }} title={`Sorties ${fcfa(m.sorties)}`} />
              </div><small>{m.label}</small><small className="pr-val">{court(m.entrees)}</small></div>
            ))}
          </div>
          <p className="pr-leg"><i className="pr-in" /> Entrées <i className="pr-out" /> Sorties</p>
        </Carte>
        <Carte titre="Activité récente" petit="toutes les caisses">
          {recents.length === 0 && <p className="pr-vide">Aucun mouvement de caisse enregistré.</p>}
          {recents.map((m, i) => (
            <div key={i} className="pr-act"><span className={`pr-fleche-act ${m.type === 'depense' ? 'pr-sortie' : 'pr-entree'}`}>{m.type === 'depense' ? '↗' : '↙'}</span>
              <div><strong>{m.description || 'Mouvement'}</strong><small>{nom(m.brancheId)} · {dateCourte(m.date)}</small></div>
              <b className={m.type === 'depense' ? 'pr-neg' : 'pr-pos'}>{m.type === 'depense' ? '−' : '+'}{court(m.montant)}</b></div>
          ))}
        </Carte>
        <Carte titre="Projets" petit="suivi des collectes">
          <p className="pr-vide" style={{ marginBottom: '.6rem' }}>Suivez les promesses et les contributions des projets du BEN et des églises.</p>
          <button className="pr-texte" onClick={() => onNaviguer('projetsNationaux')}>Projets du BEN</button>{' · '}<button className="pr-texte" onClick={() => onNaviguer('projetsBranches')}>Projets des églises</button>
        </Carte>
      </div>
      <CartesEglises lignes={lignes} onClick={() => onNaviguer('branches')} />
      <Tuiles onNaviguer={onNaviguer} liens={[['virements', '📤', 'Reversements'], ['consolidation', '📊', 'Consolidation'], ['branches', '🏛️', 'Caisses des églises'], ['projetsNationaux', '📦', 'Projets du BEN'], ['projetsBranches', '🗂️', 'Projets des églises']]} />
    </div>
  )
}

// ── Conseiller ───────────────────────────────────────────────────────────────
export function AccueilConseiller({ profil, onNaviguer }) {
  const [dossiers, setDossiers] = useState([]); const [conflits, setConflits] = useState([])
  useEffect(() => ecoute(query(collection(db, 'dossiersConseil'), orderBy('creeLe', 'desc')), setDossiers), [])
  useEffect(() => ecoute(query(collection(db, 'conflitsMIGC'), orderBy('creeLe', 'desc')), setConflits), [])
  const ouverts = dossiers.filter((d) => d.statut !== 'clos'); const urgents = ouverts.filter((d) => d.priorite === 'haute')
  const enCours = conflits.filter((c) => c.etat !== 'resolu')
  return (
    <div className="tb">
      <Entete titre={`${salutation()}, ${profil.nom ?? 'Conseiller'}.`} sous="Conseil du Bureau Exécutif National" />
      <Chiffres>
        <Chiffre valeur={ouverts.length} label={ouverts.length > 1 ? 'Dossiers ouverts' : 'Dossier ouvert'} onClick={() => onNaviguer('dossiers')} />
        <Chiffre valeur={urgents.length} label="Priorité haute" alerte={urgents.length > 0} onClick={() => onNaviguer('dossiers')} />
        <Chiffre valeur={enCours.length} label={enCours.length > 1 ? 'Conflits en médiation' : 'Conflit en médiation'} onClick={() => onNaviguer('conflits')} />
        <Chiffre valeur={conflits.length - enCours.length} label="Conflits résolus" onClick={() => onNaviguer('conflits')} />
      </Chiffres>
      <Grille>
        <Bloc titre="Dossiers à traiter" pastille={ouverts.length}>
          {ouverts.length === 0 && <Vide>Aucun dossier ouvert.</Vide>}
          {[...ouverts].sort((a, b) => (a.priorite === 'haute' ? -1 : 0) - (b.priorite === 'haute' ? -1 : 0)).slice(0, 5).map((d) => <Ligne key={d.id} titre={d.titre} detail={d.priorite === 'haute' ? 'Priorité haute' : d.priorite === 'basse' ? 'Priorité basse' : 'Priorité normale'} onClick={() => onNaviguer('dossiers')} />)}
        </Bloc>
        <Bloc titre="Conflits en médiation" pastille={enCours.length}>
          {enCours.length === 0 && <Vide>Aucun conflit en cours.</Vide>}
          {enCours.slice(0, 5).map((c) => <Ligne key={c.id} titre={c.parties} detail={c.description?.slice(0, 80)} onClick={() => onNaviguer('conflits')} />)}
        </Bloc>
      </Grille>
      <Acces onNaviguer={onNaviguer} liens={[['dossiers', 'Dossiers de conseil'], ['conflits', 'Gestion des conflits'], ['notes', 'Notes confidentielles']]} />
    </div>
  )
}
