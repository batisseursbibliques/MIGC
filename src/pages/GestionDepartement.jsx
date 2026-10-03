import React, { useEffect, useState } from 'react'
import {
  collection, addDoc, onSnapshot, query, orderBy, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'

const base = (brancheId, departementId, nom) =>
  collection(db, 'branches', brancheId, 'departements', departementId, nom)
const refDoc = (brancheId, departementId, nom, id) =>
  doc(db, 'branches', brancheId, 'departements', departementId, nom, id)

// ── Membres du ministère (l'équipe du responsable) ──────────────────────────
export function MembresDepartement({ brancheId, departementId }) {
  const [membres, setMembres] = useState([])
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [fonction, setFonction] = useState('')

  useEffect(() => {
    const q = query(base(brancheId, departementId, 'membres'), orderBy('nom'))
    return onSnapshot(q, (s) => setMembres(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [brancheId, departementId])

  async function ajouter(e) {
    e.preventDefault()
    if (!nom.trim()) return
    await addDoc(base(brancheId, departementId, 'membres'), {
      nom: nom.trim(), telephone: telephone.trim(), fonction: fonction.trim(), creeLe: serverTimestamp(),
    })
    setNom(''); setTelephone(''); setFonction('')
  }

  return (
    <div>
      <h1 className="titre-page">Membres du ministère</h1>
      <form onSubmit={ajouter} className="carte">
        <h2 className="titre-carte">Ajouter un membre</h2>
        <input className="champ-saisie" placeholder="Nom et prénom" value={nom} onChange={(e) => setNom(e.target.value)} required />
        <input className="champ-saisie" style={{ marginTop: '0.6rem' }} type="tel" placeholder="Téléphone (facultatif)" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        <input className="champ-saisie" style={{ marginTop: '0.6rem' }} placeholder="Fonction (ex. choriste, animateur…)" value={fonction} onChange={(e) => setFonction(e.target.value)} />
        <button className="bouton-principal" style={{ marginTop: '0.6rem' }}>Ajouter</button>
      </form>
      <section className="carte" style={{ marginTop: '1rem' }}>
        <h2 className="titre-carte">Équipe ({membres.length})</h2>
        <ul className="liste">
          {membres.map((m) => (
            <li key={m.id} className="ligne-liste">
              <span>
                <strong>{m.nom}</strong>
                {m.fonction && <span className="note"> · {m.fonction}</span>}
                {m.telephone && <span className="note"> · <a href={`tel:${m.telephone.replace(/\s/g, '')}`}>{m.telephone}</a></span>}
              </span>
              <button className="bouton-lien" onClick={() => window.confirm(`Retirer ${m.nom} ?`) && deleteDoc(refDoc(brancheId, departementId, 'membres', m.id))}>Retirer</button>
            </li>
          ))}
          {membres.length === 0 && <p className="note">Aucun membre enregistré pour l'instant.</p>}
        </ul>
      </section>
    </div>
  )
}

// ── Tâches du ministère ─────────────────────────────────────────────────────
const STATUTS = [['a_faire', 'À faire'], ['en_cours', 'En cours'], ['fait', 'Fait']]

export function TachesDepartement({ brancheId, departementId }) {
  const [taches, setTaches] = useState([])
  const [membres, setMembres] = useState([])
  const [titre, setTitre] = useState('')
  const [pour, setPour] = useState('')
  const [echeance, setEcheance] = useState('')

  useEffect(() => {
    const q = query(base(brancheId, departementId, 'taches'), orderBy('creeLe', 'desc'))
    return onSnapshot(q, (s) => setTaches(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [brancheId, departementId])

  useEffect(() => {
    const q = query(base(brancheId, departementId, 'membres'), orderBy('nom'))
    return onSnapshot(q, (s) => setMembres(s.docs.map((d) => d.data().nom)))
  }, [brancheId, departementId])

  async function ajouter(e) {
    e.preventDefault()
    if (!titre.trim()) return
    await addDoc(base(brancheId, departementId, 'taches'), {
      titre: titre.trim(), pour, echeance, statut: 'a_faire', creeLe: serverTimestamp(),
    })
    setTitre(''); setPour(''); setEcheance('')
  }

  const enCours = taches.filter((t) => t.statut !== 'fait')
  const faites = taches.filter((t) => t.statut === 'fait')
  const ligne = (t) => (
    <li key={t.id} className="ligne-liste-verticale">
      <strong style={{ textDecoration: t.statut === 'fait' ? 'line-through' : 'none' }}>{t.titre}</strong>
      <div className="note">
        {t.pour && <>Pour : {t.pour} · </>}
        {t.echeance && <>Échéance : {new Date(t.echeance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</>}
      </div>
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '0.3rem' }}>
        <select className="champ-saisie" style={{ width: 'auto' }} value={t.statut}
          onChange={(e) => updateDoc(refDoc(brancheId, departementId, 'taches', t.id), { statut: e.target.value })}>
          {STATUTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button className="bouton-lien" onClick={() => window.confirm('Supprimer cette tâche ?') && deleteDoc(refDoc(brancheId, departementId, 'taches', t.id))}>Supprimer</button>
      </div>
    </li>
  )

  return (
    <div>
      <h1 className="titre-page">Tâches du ministère</h1>
      <form onSubmit={ajouter} className="carte">
        <h2 className="titre-carte">Ajouter une tâche</h2>
        <input className="champ-saisie" placeholder="Ce qu'il faut faire" value={titre} onChange={(e) => setTitre(e.target.value)} required />
        <select className="champ-saisie" style={{ marginTop: '0.6rem' }} value={pour} onChange={(e) => setPour(e.target.value)}>
          <option value="">Confiée à… (facultatif)</option>
          {membres.map((n, i) => <option key={i} value={n}>{n}</option>)}
        </select>
        <input className="champ-saisie" style={{ marginTop: '0.6rem' }} type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
        <button className="bouton-principal" style={{ marginTop: '0.6rem' }}>Ajouter la tâche</button>
      </form>
      <section className="carte" style={{ marginTop: '1rem' }}>
        <h2 className="titre-carte">À suivre ({enCours.length})</h2>
        <ul className="liste">
          {enCours.map(ligne)}
          {enCours.length === 0 && <p className="note">Aucune tâche en cours.</p>}
        </ul>
      </section>
      {faites.length > 0 && (
        <section className="carte" style={{ marginTop: '1rem' }}>
          <h2 className="titre-carte">Terminées ({faites.length})</h2>
          <ul className="liste">{faites.map(ligne)}</ul>
        </section>
      )}
    </div>
  )
}
