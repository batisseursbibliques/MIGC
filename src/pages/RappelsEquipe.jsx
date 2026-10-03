import React, { useEffect, useState } from 'react'
import {
  collection, addDoc, onSnapshot, query, where, orderBy, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'

const LABELS = {
  secretaire: 'Secrétaire', secretaire_adjoint: 'Secrétaire adjoint', tresorier: 'Trésorier',
  tresorier_adjoint: 'Trésorier adjoint', departement: 'Responsable de ministère', pasteur_suppleant: 'Pasteur suppléant',
}
const fmt = (d) => (d?.toDate ? d.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '')

// ── Côté pasteur : envoyer un rappel à un collaborateur et suivre son état ──
export default function RappelsEquipe({ profil }) {
  const brancheId = profil.brancheId
  const [equipe, setEquipe] = useState([])
  const [pourUid, setPourUid] = useState('')
  const [message, setMessage] = useState('')
  const [rappels, setRappels] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'utilisateurs'), where('brancheId', '==', brancheId))
    return onSnapshot(q, (s) =>
      setEquipe(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((u) => LABELS[u.role] && !u.bloque)),
    )
  }, [brancheId])

  useEffect(() => {
    const q = query(collection(db, 'branches', brancheId, 'rappels'), orderBy('date', 'desc'))
    return onSnapshot(q, (s) => setRappels(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [brancheId])

  async function envoyer(e) {
    e.preventDefault()
    const dest = equipe.find((u) => u.id === pourUid)
    if (!dest || !message.trim()) return
    await addDoc(collection(db, 'branches', brancheId, 'rappels'), {
      pourUid: dest.id, pourNom: dest.nom, pourRole: dest.role,
      message: message.trim(), deNom: profil.nom, lu: false, date: serverTimestamp(),
    })
    setMessage('')
  }

  return (
    <div>
      <h1 className="titre-page">Rappels à l'équipe</h1>
      <form onSubmit={envoyer} className="carte">
        <h2 className="titre-carte">Envoyer un rappel</h2>
        <select className="champ-saisie" value={pourUid} onChange={(e) => setPourUid(e.target.value)} required>
          <option value="">Choisir le collaborateur…</option>
          {equipe.map((u) => <option key={u.id} value={u.id}>{u.nom} — {LABELS[u.role]}</option>)}
        </select>
        <textarea className="champ-saisie champ-texte" rows={3} style={{ marginTop: '0.6rem' }} maxLength={1000}
          placeholder="Ex. N'oublie pas d'enregistrer les offrandes de dimanche." value={message}
          onChange={(e) => setMessage(e.target.value)} required />
        <button className="bouton-principal" style={{ marginTop: '0.6rem' }}>Envoyer le rappel</button>
        {equipe.length === 0 && <p className="note">Aucun collaborateur dans votre église pour le moment. Créez-les dans « Utilisateurs ».</p>}
      </form>
      <section className="carte" style={{ marginTop: '1rem' }}>
        <h2 className="titre-carte">Rappels envoyés</h2>
        <ul className="liste">
          {rappels.map((r) => (
            <li key={r.id} className="ligne-liste-verticale">
              <strong>{r.pourNom}</strong> <span className="note">{fmt(r.date)} · {r.lu ? '✅ Fait' : '⏳ En attente'}</span>
              <p style={{ margin: '0.3rem 0' }}>{r.message}</p>
              <button className="bouton-lien" onClick={() => window.confirm('Supprimer ce rappel ?') && deleteDoc(doc(db, 'branches', brancheId, 'rappels', r.id))}>Supprimer</button>
            </li>
          ))}
          {rappels.length === 0 && <p className="note">Aucun rappel envoyé.</p>}
        </ul>
      </section>
    </div>
  )
}

// ── Côté collaborateur : bandeau des rappels du pasteur ──
export function RappelsRecus({ profil }) {
  const [rappels, setRappels] = useState([])
  useEffect(() => {
    if (!profil.brancheId) return undefined
    const q = query(collection(db, 'branches', profil.brancheId, 'rappels'), where('pourUid', '==', profil.uid))
    return onSnapshot(q, (s) => setRappels(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => !r.lu)), () => {})
  }, [profil.brancheId, profil.uid])

  if (rappels.length === 0) return null
  return (
    <div className="carte" style={{ borderLeft: '4px solid var(--or, #C9992C)', marginBottom: '1rem' }}>
      <h2 className="titre-carte">📌 Rappel de votre pasteur</h2>
      {rappels.map((r) => (
        <div key={r.id} style={{ margin: '0.5rem 0' }}>
          <p style={{ margin: 0 }}>{r.message}</p>
          <button className="bouton-lien" onClick={() => updateDoc(doc(db, 'branches', profil.brancheId, 'rappels', r.id), { lu: true, luLe: serverTimestamp() })}>
            C'est fait ✓
          </button>
        </div>
      ))}
    </div>
  )
}
