import React, { useEffect, useState } from 'react'
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import DashboardCommunication from './DashboardCommunication.jsx'

export default function DashboardDepartement({ profil }) {
  const { brancheId, departementId } = profil

  // Sécurité : si le profil est incomplet (pas de département assigné), on affiche un message clair.
  if (!brancheId || !departementId) {
    return (
      <div className="ecran-centre">
        <p>Ce compte n'est pas encore assigné à un département. Contactez le pasteur ou le responsable de l'application.</p>
      </div>
    )
  }

  const [onglet, setOnglet] = useState('comptes-rendus')
  const [contenu, setContenu] = useState('')
  const [comptesRendus, setComptesRendus] = useState([])

  useEffect(() => {
    const q = query(
      collection(db, 'branches', brancheId, 'departements', departementId, 'comptesRendus'),
      orderBy('date', 'desc'),
    )
    return onSnapshot(q, (snap) => setComptesRendus(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [brancheId, departementId])

  async function envoyerCompteRendu(e) {
    e.preventDefault()
    if (!contenu.trim()) return
    await addDoc(collection(db, 'branches', brancheId, 'departements', departementId, 'comptesRendus'), {
      contenu,
      date: serverTimestamp(),
      auteurUid: profil.uid,
    })
    setContenu('')
  }

  return (
    <div>
      <h1 className="titre-page">Mon département</h1>

      <nav className="onglets">
        <button className={onglet === 'comptes-rendus' ? 'onglet actif' : 'onglet'} onClick={() => setOnglet('comptes-rendus')}>Comptes-rendus</button>
        <button className={onglet === 'communication' ? 'onglet actif' : 'onglet'} onClick={() => setOnglet('communication')}>Communication</button>
      </nav>

      {onglet === 'comptes-rendus' && (
        <div className="grille-deux">
          <section className="carte">
            <h2 className="titre-carte">Envoyer un compte-rendu au pasteur</h2>
            <form onSubmit={envoyerCompteRendu} className="formulaire">
              <textarea
                placeholder="Ce qui s'est passé, ce qui a été fait…"
                value={contenu}
                onChange={(e) => setContenu(e.target.value)}
                className="champ-saisie champ-texte"
                rows={5}
                required
              />
              <button type="submit" className="bouton-principal">Envoyer</button>
            </form>
          </section>

          <section className="carte">
            <h2 className="titre-carte">Historique</h2>
            <ul className="liste">
              {comptesRendus.map((c) => (
                <li key={c.id} className="ligne-liste-verticale">{c.contenu}</li>
              ))}
              {comptesRendus.length === 0 && <p className="note">Aucun compte-rendu envoyé pour l'instant.</p>}
            </ul>
          </section>
        </div>
      )}

      {onglet === 'communication' && (
        <DashboardCommunication brancheId={brancheId} uid={profil.uid} />
      )}
    </div>
  )
}
