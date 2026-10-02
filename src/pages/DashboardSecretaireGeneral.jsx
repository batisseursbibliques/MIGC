import React, { useEffect, useState } from 'react'
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, collectionGroup } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

export default function DashboardSecretaireGeneral({ profil , page = 'membres'}) {
  const { uid } = profil
  const onglet = page

  return (
    <div>
      <h1 className="titre-page">Secrétariat Général du BEN — MIGC</h1>
      {onglet === 'membres' && <VueMembresNational />}
      {onglet === 'pv' && <PVNational uid={uid} />}
      {onglet === 'courrier' && <CourrierNational uid={uid} />}
      {onglet === 'rapportsBranches' && <RapportsPVBranches />}
    </div>
  )
}

function VueMembresNational() {
  const [membres, setMembres] = useState([])
  useEffect(() => onSnapshot(collectionGroup(db, 'membres'), (snap) => (
    setMembres(snap.docs.map((d) => ({ id: d.id, brancheId: d.ref.parent.parent.id, ...d.data() })))
  )), [])

  const parStatut = membres.reduce((acc, m) => {
    const s = m.statut || 'non renseigné'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Total des membres</h2>
        <p className="grand-nombre">{membres.length}</p>
        <ul className="liste" style={{ marginTop: '1rem' }}>
          {Object.entries(parStatut).map(([s, n]) => (
            <li key={s} className="ligne-liste">
              <span>{s.replace('_', ' ')}</span><span>{n}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="carte">
        <h2 className="titre-carte">Liste complète</h2>
        <ul className="liste">
          {membres.map((m) => (
            <li key={m.id} className="ligne-liste">
              <span>{m.prenom} {m.nom}</span>
              <span className="etiquette">{m.statut?.replace('_', ' ')}</span>
            </li>
          ))}
          {membres.length === 0 && <p className="note">Aucun membre enregistré dans les églises locales.</p>}
        </ul>
      </section>
    </div>
  )
}

function PVNational({ uid }) {
  const [pvs, setPvs] = useState([])
  const [date, setDate] = useState('')
  const [objet, setObjet] = useState('')
  const [contenu, setContenu] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'pvNationaux'), orderBy('date', 'desc'))
    return onSnapshot(q, (snap) => setPvs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  async function ajouter(e) {
    e.preventDefault()
    await addDoc(collection(db, 'pvNationaux'), { date, objet, contenu, redacteurUid: uid, creeLe: serverTimestamp() })
    setDate(''); setObjet(''); setContenu('')
  }

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Rédiger un PV national</h2>
        <form onSubmit={ajouter} className="formulaire">
          <label className="champ-label">Date de la réunion</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="champ-saisie" required />
          <input type="text" placeholder="Objet / titre" value={objet} onChange={(e) => setObjet(e.target.value)} className="champ-saisie" required />
          <textarea placeholder="Contenu…" value={contenu} onChange={(e) => setContenu(e.target.value)} className="champ-saisie champ-texte" rows={6} />
          <button type="submit" className="bouton-principal">Enregistrer</button>
        </form>
      </section>
      <section className="carte">
        <h2 className="titre-carte">PV du BEN ({pvs.length})</h2>
        <ul className="liste">
          {pvs.map((p) => (
            <li key={p.id} className="ligne-liste-verticale">
              <strong>{p.date ? new Date(p.date + 'T00:00').toLocaleDateString('fr-FR') : '—'}</strong> — {p.objet}
              {p.contenu && <p className="note" style={{ marginTop: '0.25rem' }}>{p.contenu.slice(0, 120)}{p.contenu.length > 120 ? '…' : ''}</p>}
            </li>
          ))}
          {pvs.length === 0 && <p className="note">Aucun PV national enregistré.</p>}
        </ul>
      </section>
    </div>
  )
}

function CourrierNational({ uid }) {
  const [courriers, setCourriers] = useState([])
  const [date, setDate] = useState('')
  const [sens, setSens] = useState('entrant')
  const [expediteur, setExpediteur] = useState('')
  const [objet, setObjet] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'courrierNational'), orderBy('date', 'desc'))
    return onSnapshot(q, (snap) => setCourriers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  async function ajouter(e) {
    e.preventDefault()
    await addDoc(collection(db, 'courrierNational'), { date, sens, expediteur, objet, enregistreParUid: uid, creeLe: serverTimestamp() })
    setDate(''); setExpediteur(''); setObjet('')
  }

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Enregistrer un courrier</h2>
        <form onSubmit={ajouter} className="formulaire">
          <label className="champ-label">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="champ-saisie" required />
          <select value={sens} onChange={(e) => setSens(e.target.value)} className="champ-saisie">
            <option value="entrant">Courrier entrant</option>
            <option value="sortant">Courrier sortant</option>
          </select>
          <input type="text" placeholder="Expéditeur / Destinataire" value={expediteur} onChange={(e) => setExpediteur(e.target.value)} className="champ-saisie" required />
          <input type="text" placeholder="Objet" value={objet} onChange={(e) => setObjet(e.target.value)} className="champ-saisie" required />
          <button type="submit" className="bouton-principal">Enregistrer</button>
        </form>
      </section>
      <section className="carte">
        <h2 className="titre-carte">Registre ({courriers.length})</h2>
        <ul className="liste">
          {courriers.map((c) => (
            <li key={c.id} className="ligne-liste">
              <span className="etiquette">{c.sens === 'entrant' ? '↓ Entrant' : '↑ Sortant'}</span>
              <span>{c.date ? new Date(c.date + 'T00:00').toLocaleDateString('fr-FR') : '—'}</span>
              <span>{c.expediteur}</span>
              <span>{c.objet}</span>
            </li>
          ))}
          {courriers.length === 0 && <p className="note">Aucun courrier enregistré.</p>}
        </ul>
      </section>
    </div>
  )
}

function RapportsPVBranches() {
  const [pvs, setPvs] = useState([])
  const [branches, setBranches] = useState([])

  useEffect(() => onSnapshot(collection(db, 'branches'), (snap) => (
    setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  )), [])

  useEffect(() => {
    const q = query(collectionGroup(db, 'pv'), orderBy('date', 'desc'))
    return onSnapshot(q, (snap) => setPvs(snap.docs.map((d) => ({
      id: d.id, brancheId: d.ref.parent.parent.id, ...d.data(),
    }))))
  }, [])

  return (
    <section className="carte">
      <h2 className="titre-carte">Procès-verbaux de toutes les églises locales</h2>
      <ul className="liste">
        {pvs.map((p) => {
          const branche = branches.find((b) => b.id === p.brancheId)
          return (
            <li key={p.id} className="ligne-liste-verticale">
              <span className="etiquette">{branche?.nom ?? p.brancheId}</span>
              <strong style={{ marginLeft: '0.5rem' }}>{p.date ? new Date(p.date + 'T00:00').toLocaleDateString('fr-FR') : '—'}</strong> — {p.objet}
            </li>
          )
        })}
        {pvs.length === 0 && <p className="note">Aucun PV de branche disponible.</p>}
      </ul>
    </section>
  )
}
