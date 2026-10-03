import React, { useEffect, useState } from 'react'
import {
  collection, addDoc, onSnapshot, orderBy, query,
  doc, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { AccueilConseiller } from './AccueilRoles.jsx'

export default function DashboardConseillerNational({ profil , page = 'accueil', onNaviguer = () => {} }) {
  const onglet = page

  return (
    <div>
      {onglet !== 'accueil' && <h1 className="titre-page">Conseiller du BEN — MIGC</h1>}
      {onglet === 'accueil' && <AccueilConseiller profil={profil} onNaviguer={onNaviguer} />}
      {onglet === 'dossiers' && <DossierConseil uid={profil.uid} />}
      {onglet === 'conflits' && <GestionConflits uid={profil.uid} />}
      {onglet === 'notes' && <NotesConseiller uid={profil.uid} />}
    </div>
  )
}

function DossierConseil({ uid }) {
  const [dossiers, setDossiers] = useState([])
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [priorite, setPriorite] = useState('normale')

  useEffect(() => {
    const q = query(collection(db, 'dossiersConseil'), orderBy('creeLe', 'desc'))
    return onSnapshot(q, (snap) => setDossiers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  async function creer(e) {
    e.preventDefault()
    await addDoc(collection(db, 'dossiersConseil'), {
      titre, description, priorite, statut: 'ouvert',
      auteurUid: uid, creeLe: serverTimestamp(),
    })
    setTitre(''); setDescription('')
  }

  async function fermer(id) {
    await updateDoc(doc(db, 'dossiersConseil', id), { statut: 'clos', closLe: serverTimestamp() })
  }

  const PRIORITES = { haute: { label: 'Haute', couleur: 'var(--erreur)' }, normale: { label: 'Normale', couleur: 'var(--ocre)' }, basse: { label: 'Basse', couleur: 'var(--texte-doux)' } }

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Ouvrir un dossier de conseil</h2>
        <form onSubmit={creer} className="formulaire">
          <input type="text" placeholder="Sujet *" value={titre} onChange={(e) => setTitre(e.target.value)} className="champ-saisie" required />
          <select value={priorite} onChange={(e) => setPriorite(e.target.value)} className="champ-saisie">
            <option value="haute">Priorité haute</option>
            <option value="normale">Priorité normale</option>
            <option value="basse">Priorité basse</option>
          </select>
          <textarea placeholder="Description, contexte, recommandations initiales…" value={description} onChange={(e) => setDescription(e.target.value)} className="champ-saisie champ-texte" rows={5} />
          <button type="submit" className="bouton-principal">Créer le dossier</button>
        </form>
      </section>
      <section className="carte">
        <h2 className="titre-carte">Dossiers ouverts</h2>
        <ul className="liste">
          {dossiers.filter(d => d.statut !== 'clos').map((d) => {
            const p = PRIORITES[d.priorite] ?? PRIORITES.normale
            return (
              <li key={d.id} className="ligne-liste-verticale">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{d.titre}</strong>
                  <span className="etiquette" style={{ color: p.couleur, borderColor: p.couleur }}>{p.label}</span>
                </div>
                {d.description && <p className="note" style={{ margin: '0.25rem 0' }}>{d.description.slice(0, 120)}…</p>}
                <button className="bouton-lien" style={{ color: 'var(--sauge)' }} onClick={() => fermer(d.id)}>Marquer comme clos</button>
              </li>
            )
          })}
          {dossiers.filter(d => d.statut !== 'clos').length === 0 && <p className="note">Aucun dossier ouvert.</p>}
        </ul>
      </section>
    </div>
  )
}

function GestionConflits({ uid }) {
  const [conflits, setConflits] = useState([])
  const [parties, setParties] = useState('')
  const [description, setDescription] = useState('')
  const [etat, setEtat] = useState('en_cours')

  useEffect(() => {
    const q = query(collection(db, 'conflitsMIGC'), orderBy('creeLe', 'desc'))
    return onSnapshot(q, (snap) => setConflits(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  async function enregistrer(e) {
    e.preventDefault()
    await addDoc(collection(db, 'conflitsMIGC'), {
      parties, description, etat, auteurUid: uid, creeLe: serverTimestamp(),
    })
    setParties(''); setDescription('')
  }

  async function resoudre(id) {
    await updateDoc(doc(db, 'conflitsMIGC', id), { etat: 'resolu', resoluLe: serverTimestamp() })
  }

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Enregistrer un conflit</h2>
        <form onSubmit={enregistrer} className="formulaire">
          <input type="text" placeholder="Parties impliquées *" value={parties} onChange={(e) => setParties(e.target.value)} className="champ-saisie" required />
          <select value={etat} onChange={(e) => setEtat(e.target.value)} className="champ-saisie">
            <option value="en_cours">En cours de médiation</option>
            <option value="resolu">Résolu</option>
          </select>
          <textarea placeholder="Description du conflit, contexte, mesures prises…" value={description} onChange={(e) => setDescription(e.target.value)} className="champ-saisie champ-texte" rows={5} />
          <button type="submit" className="bouton-principal">Enregistrer</button>
        </form>
      </section>
      <section className="carte">
        <h2 className="titre-carte">Conflits suivis ({conflits.length})</h2>
        <ul className="liste">
          {conflits.map((c) => (
            <li key={c.id} className="ligne-liste-verticale">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{c.parties}</strong>
                <span className="etiquette" style={{ color: c.etat === 'resolu' ? 'var(--sauge)' : 'var(--erreur)' }}>
                  {c.etat === 'resolu' ? 'Résolu' : 'En cours'}
                </span>
              </div>
              {c.description && <p className="note" style={{ margin: '0.25rem 0' }}>{c.description.slice(0, 100)}…</p>}
              {c.etat !== 'resolu' && (
                <button className="bouton-lien" style={{ color: 'var(--sauge)' }} onClick={() => resoudre(c.id)}>Marquer résolu</button>
              )}
            </li>
          ))}
          {conflits.length === 0 && <p className="note">Aucun conflit enregistré.</p>}
        </ul>
      </section>
    </div>
  )
}

function NotesConseiller({ uid }) {
  const [notes, setNotes] = useState([])
  const [texte, setTexte] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'utilisateurs', uid, 'notesConseiller'), orderBy('creeLe', 'desc'))
    return onSnapshot(q, (snap) => setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [uid])

  async function ajouter(e) {
    e.preventDefault()
    await addDoc(collection(db, 'utilisateurs', uid, 'notesConseiller'), {
      texte, creeLe: serverTimestamp(),
    })
    setTexte('')
  }

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Nouvelle note confidentielle</h2>
        <p className="note" style={{ marginBottom: '0.75rem' }}>Ces notes sont visibles uniquement par vous.</p>
        <form onSubmit={ajouter} className="formulaire">
          <textarea placeholder="Note…" value={texte} onChange={(e) => setTexte(e.target.value)} className="champ-saisie champ-texte" rows={6} required />
          <button type="submit" className="bouton-principal">Enregistrer</button>
        </form>
      </section>
      <section className="carte">
        <h2 className="titre-carte">Notes ({notes.length})</h2>
        <ul className="liste">
          {notes.map((n) => (
            <li key={n.id} className="ligne-liste-verticale">
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{n.texte}</p>
            </li>
          ))}
          {notes.length === 0 && <p className="note">Aucune note enregistrée.</p>}
        </ul>
      </section>
    </div>
  )
}
