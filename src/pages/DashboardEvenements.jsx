import React, { useEffect, useState } from 'react'
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

const TYPES_EVENEMENT = [
  { valeur: 'bapteme', label: 'Baptême' },
  { valeur: 'mariage', label: 'Mariage' },
  { valeur: 'dedicace', label: "Dédicace d'enfant" },
  { valeur: 'funerailles', label: 'Funérailles' },
]

export default function DashboardEvenements({ brancheId }) {
  const [evenements, setEvenements] = useState([])
  const [type, setType] = useState('bapteme')
  const [date, setDate] = useState('')
  const [personnesConcernees, setPersonnesConcernees] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'branches', brancheId, 'evenements'), orderBy('date', 'desc'))
    return onSnapshot(q, (snap) => setEvenements(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [brancheId])

  async function ajouterEvenement(e) {
    e.preventDefault()
    if (!date) return
    await addDoc(collection(db, 'branches', brancheId, 'evenements'), {
      type, date, personnesConcernees, notes,
    })
    setDate('')
    setPersonnesConcernees('')
    setNotes('')
  }

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Enregistrer un événement</h2>
        <form onSubmit={ajouterEvenement} className="formulaire">
          <select value={type} onChange={(e) => setType(e.target.value)} className="champ-saisie">
            {TYPES_EVENEMENT.map((t) => (
              <option key={t.valeur} value={t.valeur}>{t.label}</option>
            ))}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="champ-saisie" required />
          <input
            type="text" placeholder="Personne(s) concernée(s)" value={personnesConcernees}
            onChange={(e) => setPersonnesConcernees(e.target.value)} className="champ-saisie"
          />
          <textarea
            placeholder="Notes (optionnel)" value={notes}
            onChange={(e) => setNotes(e.target.value)} className="champ-saisie champ-texte" rows={2}
          />
          <button type="submit" className="bouton-principal">Enregistrer</button>
        </form>
      </section>

      <section className="carte">
        <h2 className="titre-carte">Historique ({evenements.length})</h2>
        <ul className="liste">
          {evenements.map((ev) => (
            <li key={ev.id} className="ligne-liste">
              <span>{formatterDate(ev.date)}</span>
              <span>{TYPES_EVENEMENT.find((t) => t.valeur === ev.type)?.label}</span>
              <span className="etiquette">{ev.personnesConcernees || '—'}</span>
            </li>
          ))}
          {evenements.length === 0 && <p className="note">Aucun événement enregistré pour l'instant.</p>}
        </ul>
      </section>
    </div>
  )
}

function formatterDate(iso) {
  if (!iso) return ''
  return new Date(iso + 'T00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
