import React, { useEffect, useState } from 'react'
import {
  doc, updateDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'

const ETAPES = [
  { cle: 'convertiLe', label: 'Converti(e)' },
  { cle: 'baptiseLe', label: 'Baptisé(e)' },
  { cle: 'formationTermineeLe', label: 'Formation terminée' },
  { cle: 'ministereActifLe', label: 'Engagé(e) dans un ministère' },
]

export default function SuiviMembre({ brancheId, membre, uid, onFermer }) {
  const [notes, setNotes] = useState([])
  const [nouvelleNote, setNouvelleNote] = useState('')

  const refMembre = doc(db, 'branches', brancheId, 'membres', membre.id)

  useEffect(() => {
    const q = query(
      collection(db, 'branches', brancheId, 'membres', membre.id, 'suivi'),
      orderBy('date', 'desc'),
    )
    return onSnapshot(q, (snap) => setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [brancheId, membre.id])

  async function basculerEtape(cle) {
    const valeurActuelle = membre[cle]
    await updateDoc(refMembre, { [cle]: valeurActuelle ? null : new Date().toISOString().slice(0, 10) })
  }

  async function ajouterNote(e) {
    e.preventDefault()
    if (!nouvelleNote.trim()) return
    await addDoc(collection(db, 'branches', brancheId, 'membres', membre.id, 'suivi'), {
      contenu: nouvelleNote,
      date: serverTimestamp(),
      auteurUid: uid,
    })
    setNouvelleNote('')
  }

  return (
    <div>
      <div className="ligne-liste" style={{ borderBottom: 'none', marginBottom: '0.5rem' }}>
        <h2 className="titre-carte" style={{ margin: 0 }}>{membre.prenom} {membre.nom}</h2>
        <button className="bouton-lien" onClick={onFermer}>Fermer</button>
      </div>

      <h3 className="titre-section">Étapes du parcours</h3>
      <ul className="liste">
        {ETAPES.map((etape) => (
          <li key={etape.cle} className="ligne-liste">
            <span>{etape.label}</span>
            <span className="etiquette">{membre[etape.cle] || 'pas encore'}</span>
            <button className="bouton-lien" onClick={() => basculerEtape(etape.cle)}>
              {membre[etape.cle] ? 'Annuler' : 'Marquer aujourd\'hui'}
            </button>
          </li>
        ))}
      </ul>

      <h3 className="titre-section">Notes de suivi</h3>
      <form onSubmit={ajouterNote} className="formulaire">
        <textarea
          placeholder="Ex. : entretien avec le pasteur, situation particulière, progrès observé…"
          value={nouvelleNote}
          onChange={(e) => setNouvelleNote(e.target.value)}
          className="champ-saisie champ-texte"
          rows={3}
        />
        <button type="submit" className="bouton-secondaire">Ajouter la note</button>
      </form>
      <ul className="liste">
        {notes.map((n) => (
          <li key={n.id} className="ligne-liste-verticale">{n.contenu}</li>
        ))}
        {notes.length === 0 && <p className="note">Aucune note pour l'instant.</p>}
      </ul>
    </div>
  )
}
