import React, { useState } from 'react'
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

export default function DashboardBranches({ branches }) {
  const [nom, setNom] = useState('')
  const [ville, setVille] = useState('')
  const [seuilSolde, setSeuilSolde] = useState('50000')  // Plafond par défaut (à confirmer par le BEN) : 50 000 FCFA
  const [brancheSelectionnee, setBrancheSelectionnee] = useState(null)

  async function creerBranche(e) {
    e.preventDefault()
    if (!nom.trim()) return
    await addDoc(collection(db, 'branches'), {
      nom, ville, pasteurNom: '', seuilSolde: seuilSolde ? Number(seuilSolde) : null,
    })
    setNom('')
    setVille('')
    setSeuilSolde('')
  }

  const brancheAffichee = branches.find((b) => b.id === brancheSelectionnee)

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Créer une branche</h2>
        <form onSubmit={creerBranche} className="formulaire">
          <input type="text" placeholder="Nom de l'église/branche" value={nom} onChange={(e) => setNom(e.target.value)} className="champ-saisie" required />
          <input type="text" placeholder="Ville" value={ville} onChange={(e) => setVille(e.target.value)} className="champ-saisie" />
          <input
            type="number" placeholder="Plafond de caisse (FCFA)" value={seuilSolde}
            onChange={(e) => setSeuilSolde(e.target.value)} className="champ-saisie"
          />
          <button type="submit" className="bouton-principal">Créer la branche</button>
        </form>
        <p className="note">
          Une fois l'église locale créée, utilisez l'onglet Utilisateurs pour créer le compte du Pasteur Responsable et de
          l'associer à cette église locale dans firestore.rules.
        </p>

        <h2 className="titre-carte" style={{ marginTop: '2rem' }}>Églises locales ({branches.length})</h2>
        <ul className="liste">
          {branches.map((b) => (
            <li key={b.id} className="ligne-liste" style={{ cursor: 'pointer' }} onClick={() => setBrancheSelectionnee(b.id)}>
              <span>{b.nom}</span>
              <span className="etiquette">{b.pasteurNom || 'sans pasteur assigné'}</span>
            </li>
          ))}
          {branches.length === 0 && <p className="note">Aucune branche créée pour l'instant.</p>}
        </ul>
      </section>

      <section className="carte">
        {brancheAffichee ? (
          <DetailBranche branche={brancheAffichee} onFermer={() => setBrancheSelectionnee(null)} />
        ) : (
          <p className="note">Sélectionne une branche pour voir ou modifier ses informations.</p>
        )}
      </section>
    </div>
  )
}

function DetailBranche({ branche, onFermer }) {
  const [ville, setVille] = useState(branche.ville || '')
  const [pasteurNom, setPasteurNom] = useState(branche.pasteurNom || '')
  const [seuilSolde, setSeuilSolde] = useState(branche.seuilSolde ?? '')

  async function enregistrer(e) {
    e.preventDefault()
    await updateDoc(doc(db, 'branches', branche.id), {
      ville,
      pasteurNom,
      seuilSolde: seuilSolde === '' ? null : Number(seuilSolde),
    })
  }

  return (
    <div>
      <div className="ligne-liste" style={{ borderBottom: 'none', marginBottom: '0.5rem' }}>
        <h2 className="titre-carte" style={{ margin: 0 }}>{branche.nom}</h2>
        <button className="bouton-lien" onClick={onFermer}>Fermer</button>
      </div>

      <form onSubmit={enregistrer} className="formulaire">
        <label className="champ-label">Ville</label>
        <input type="text" value={ville} onChange={(e) => setVille(e.target.value)} className="champ-saisie" />

        <label className="champ-label">Nom du pasteur</label>
        <input type="text" value={pasteurNom} onChange={(e) => setPasteurNom(e.target.value)} className="champ-saisie" />
        <p className="note" style={{ marginTop: '-0.5rem' }}>
          Ce champ est juste informatif. Le compte du pasteur (accès à l'application) doit
          être activé par le gestionnaire technique de l'application.
        </p>

        <label className="champ-label">Seuil de solde de caisse (FCFA)</label>
        <input type="number" value={seuilSolde} onChange={(e) => setSeuilSolde(e.target.value)} className="champ-saisie" />

        <button type="submit" className="bouton-principal">Enregistrer</button>
      </form>
    </div>
  )
}
