import React, { useEffect, useState } from 'react'
import {
  collection, addDoc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'

export default function DashboardCommunication({ brancheId, uid, peutPublierBranche, peutPublierNational }) {
  const [annonces, setAnnonces] = useState([])
  const [annoncesNationales, setAnnoncesNationales] = useState([])
  const [titre, setTitre] = useState('')
  const [contenu, setContenu] = useState('')
  const [portee, setPortee] = useState(brancheId ? 'branche' : 'national')

  useEffect(() => {
    if (!brancheId) return
    const q = query(collection(db, 'branches', brancheId, 'annonces'), orderBy('date', 'desc'))
    return onSnapshot(q, (snap) => setAnnonces(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [brancheId])

  useEffect(() => {
    const q = query(collection(db, 'annoncesNationales'), orderBy('date', 'desc'))
    return onSnapshot(q, (snap) => setAnnoncesNationales(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  async function publier(e) {
    e.preventDefault()
    if (!titre.trim()) return
    const donnees = { titre, contenu, date: serverTimestamp(), auteurUid: uid }
    if (portee === 'national') {
      await addDoc(collection(db, 'annoncesNationales'), donnees)
    } else {
      await addDoc(collection(db, 'branches', brancheId, 'annonces'), donnees)
    }
    setTitre('')
    setContenu('')
  }

  const peutPublier = peutPublierBranche || peutPublierNational

  return (
    <div className="grille-deux">
      {peutPublier && (
        <section className="carte">
          <h2 className="titre-carte">Publier une annonce</h2>
          <form onSubmit={publier} className="formulaire">
            {peutPublierBranche && peutPublierNational && (
              <select value={portee} onChange={(e) => setPortee(e.target.value)} className="champ-saisie">
                <option value="branche">Pour mon église locale</option>
                <option value="national">Pour tout le mouvement</option>
              </select>
            )}
            <input
              type="text" placeholder="Titre" value={titre}
              onChange={(e) => setTitre(e.target.value)} className="champ-saisie" required
            />
            <textarea
              placeholder="Contenu de l'annonce" value={contenu}
              onChange={(e) => setContenu(e.target.value)} className="champ-saisie champ-texte" rows={4}
            />
            <button type="submit" className="bouton-principal">Publier</button>
          </form>
        </section>
      )}

      <section className="carte">
        {annoncesNationales.length > 0 && (
          <>
            <h2 className="titre-carte">Annonces du mouvement</h2>
            <ul className="liste">
              {annoncesNationales.map((a) => (
                <li key={a.id} className="ligne-liste-verticale">
                  <strong>{a.titre}</strong>
                  {a.contenu && <p className="note" style={{ margin: '0.25rem 0 0 0' }}>{a.contenu}</p>}
                </li>
              ))}
            </ul>
          </>
        )}

        {brancheId && (
          <>
            <h2 className="titre-carte" style={{ marginTop: annoncesNationales.length > 0 ? '2rem' : 0 }}>
              Annonces de l'église locale
            </h2>
            <ul className="liste">
              {annonces.map((a) => (
                <li key={a.id} className="ligne-liste-verticale">
                  <strong>{a.titre}</strong>
                  {a.contenu && <p className="note" style={{ margin: '0.25rem 0 0 0' }}>{a.contenu}</p>}
                </li>
              ))}
              {annonces.length === 0 && <p className="note">Aucune annonce pour l'instant.</p>}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
