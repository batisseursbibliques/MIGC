import React, { useEffect, useState } from 'react'
import {
  collection, addDoc, onSnapshot, orderBy, query,
  doc, updateDoc, serverTimestamp, deleteDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'

// L'Organisateur National gère la logistique des réunions du BEN :
// ordre du jour, convocations, compte-rendu de présence.
export default function DashboardOrganisateurNational({ profil , page = 'reunions'}) {
  const onglet = page

  return (
    <div>
      <h1 className="titre-page">Organisateur National — MIGC</h1>
      {onglet === 'reunions' && <GestionReunions uid={profil.uid} />}
      {onglet === 'convocations' && <GestionConvocations uid={profil.uid} />}
      {onglet === 'logistique' && <NotesLogistique uid={profil.uid} />}
    </div>
  )
}

function GestionReunions({ uid }) {
  const [reunions, setReunions] = useState([])
  const [titre, setTitre] = useState('')
  const [date, setDate] = useState('')
  const [lieu, setLieu] = useState('')
  const [typeReunion, setTypeReunion] = useState('ordinaire')
  const [ordreJour, setOrdreJour] = useState('')
  const [reunionOuverte, setReunionOuverte] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'reunionsBEN'), orderBy('date', 'desc'))
    return onSnapshot(q, (snap) => setReunions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  async function creer(e) {
    e.preventDefault()
    await addDoc(collection(db, 'reunionsBEN'), {
      titre, date, lieu, typeReunion, ordreJour,
      statut: 'planifiee', creeParUid: uid, creeLe: serverTimestamp(),
    })
    setTitre(''); setDate(''); setLieu(''); setOrdreJour('')
  }

  async function changerStatut(r, statut) {
    await updateDoc(doc(db, 'reunionsBEN', r.id), { statut })
  }

  async function supprimer(r) {
    if (!window.confirm('Supprimer cette réunion ?')) return
    await deleteDoc(doc(db, 'reunionsBEN', r.id))
  }

  const STATUTS = {
    planifiee: { label: 'Planifiée', couleur: 'var(--ocre)' },
    tenue: { label: 'Tenue', couleur: 'var(--sauge)' },
    annulee: { label: 'Annulée', couleur: 'var(--erreur)' },
  }

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Planifier une réunion BEN</h2>
        <form onSubmit={creer} className="formulaire">
          <input type="text" placeholder="Titre de la réunion *" value={titre} onChange={(e) => setTitre(e.target.value)} className="champ-saisie" required />
          <select value={typeReunion} onChange={(e) => setTypeReunion(e.target.value)} className="champ-saisie">
            <option value="ordinaire">Session ordinaire</option>
            <option value="extraordinaire">Session extraordinaire</option>
            <option value="ag">Assemblée Générale Nationale</option>
            <option value="conseil_pastoral">Conseil Pastoral</option>
          </select>
          <label className="champ-label">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="champ-saisie" required />
          <input type="text" placeholder="Lieu" value={lieu} onChange={(e) => setLieu(e.target.value)} className="champ-saisie" />
          <textarea
            placeholder="Ordre du jour (un point par ligne)…"
            value={ordreJour} onChange={(e) => setOrdreJour(e.target.value)}
            className="champ-saisie champ-texte" rows={5}
          />
          <button type="submit" className="bouton-principal">Enregistrer</button>
        </form>
      </section>

      <section className="carte">
        <h2 className="titre-carte">Réunions planifiées ({reunions.length})</h2>
        <ul className="liste">
          {reunions.map((r) => {
            const s = STATUTS[r.statut] ?? STATUTS.planifiee
            return (
              <li key={r.id} className="ligne-liste-verticale">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong>{r.titre}</strong>
                    <p className="note" style={{ margin: '0.2rem 0 0' }}>
                      {r.date ? new Date(r.date + 'T00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                      {r.lieu && ` — ${r.lieu}`}
                    </p>
                  </div>
                  <span className="etiquette" style={{ color: s.couleur, borderColor: s.couleur, flexShrink: 0 }}>{s.label}</span>
                </div>
                {r.ordreJour && (
                  <p className="note" style={{ marginTop: '0.4rem', whiteSpace: 'pre-line' }}>
                    {r.ordreJour.slice(0, 150)}{r.ordreJour.length > 150 ? '…' : ''}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  {r.statut === 'planifiee' && (
                    <button className="bouton-secondaire" onClick={() => changerStatut(r, 'tenue')}>Marquer tenue</button>
                  )}
                  {r.statut === 'planifiee' && (
                    <button className="bouton-lien" style={{ color: 'var(--erreur)' }} onClick={() => changerStatut(r, 'annulee')}>Annuler</button>
                  )}
                  <button className="bouton-lien" onClick={() => supprimer(r)}>Supprimer</button>
                </div>
              </li>
            )
          })}
          {reunions.length === 0 && <p className="note">Aucune réunion planifiée.</p>}
        </ul>
      </section>
    </div>
  )
}

function GestionConvocations({ uid }) {
  const [convocations, setConvocations] = useState([])
  const [destinataires, setDestinataires] = useState('')
  const [objet, setObjet] = useState('')
  const [contenu, setContenu] = useState('')
  const [dateEnvoi, setDateEnvoi] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'convocationsBEN'), orderBy('dateEnvoi', 'desc'))
    return onSnapshot(q, (snap) => setConvocations(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  async function enregistrer(e) {
    e.preventDefault()
    await addDoc(collection(db, 'convocationsBEN'), {
      destinataires, objet, contenu, dateEnvoi,
      emetteurUid: uid, creeLe: serverTimestamp(),
    })
    setDestinataires(''); setObjet(''); setContenu(''); setDateEnvoi('')
  }

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Rédiger une convocation</h2>
        <form onSubmit={enregistrer} className="formulaire">
          <input type="text" placeholder="Destinataires *" value={destinataires} onChange={(e) => setDestinataires(e.target.value)} className="champ-saisie" required />
          <input type="text" placeholder="Objet *" value={objet} onChange={(e) => setObjet(e.target.value)} className="champ-saisie" required />
          <label className="champ-label">Date d'envoi</label>
          <input type="date" value={dateEnvoi} onChange={(e) => setDateEnvoi(e.target.value)} className="champ-saisie" />
          <textarea placeholder="Contenu de la convocation…" value={contenu} onChange={(e) => setContenu(e.target.value)} className="champ-saisie champ-texte" rows={6} />
          <button type="submit" className="bouton-principal">Enregistrer</button>
        </form>
      </section>
      <section className="carte">
        <h2 className="titre-carte">Convocations ({convocations.length})</h2>
        <ul className="liste">
          {convocations.map((c) => (
            <li key={c.id} className="ligne-liste-verticale">
              <strong>{c.objet}</strong>
              <p className="note" style={{ margin: '0.2rem 0 0' }}>À : {c.destinataires}</p>
              {c.contenu && <p className="note" style={{ marginTop: '0.25rem' }}>{c.contenu.slice(0, 100)}…</p>}
            </li>
          ))}
          {convocations.length === 0 && <p className="note">Aucune convocation enregistrée.</p>}
        </ul>
      </section>
    </div>
  )
}

function NotesLogistique({ uid }) {
  const [notes, setNotes] = useState([])
  const [texte, setTexte] = useState('')
  const [categorie, setCategorie] = useState('materiel')

  useEffect(() => {
    const q = query(collection(db, 'logistiqueBEN'), orderBy('creeLe', 'desc'))
    return onSnapshot(q, (snap) => setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  async function ajouter(e) {
    e.preventDefault()
    await addDoc(collection(db, 'logistiqueBEN'), { texte, categorie, auteurUid: uid, creeLe: serverTimestamp() })
    setTexte('')
  }

  const CATEGORIES = { materiel: 'Matériel', lieu: 'Lieu', transport: 'Transport', autre: 'Autre' }

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Ajouter une note logistique</h2>
        <form onSubmit={ajouter} className="formulaire">
          <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className="champ-saisie">
            {Object.entries(CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <textarea placeholder="Détails…" value={texte} onChange={(e) => setTexte(e.target.value)} className="champ-saisie champ-texte" rows={4} required />
          <button type="submit" className="bouton-principal">Enregistrer</button>
        </form>
      </section>
      <section className="carte">
        <h2 className="titre-carte">Notes ({notes.length})</h2>
        <ul className="liste">
          {notes.map((n) => (
            <li key={n.id} className="ligne-liste-verticale">
              <span className="etiquette">{CATEGORIES[n.categorie] ?? n.categorie}</span>
              <p style={{ margin: '0.3rem 0 0', whiteSpace: 'pre-wrap' }}>{n.texte}</p>
            </li>
          ))}
          {notes.length === 0 && <p className="note">Aucune note logistique.</p>}
        </ul>
      </section>
    </div>
  )
}
