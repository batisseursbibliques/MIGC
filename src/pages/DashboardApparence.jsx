import React, { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

export default function DashboardApparence({ brancheId, branche }) {
  const [nomAffiche, setNomAffiche] = useState(branche?.nom || '')
  const [logoUrl, setLogoUrl] = useState(branche?.logoUrl || '')
  const [couleurPrimaire, setCouleurPrimaire] = useState(branche?.couleurPrimaire || '#1B2A22')
  const [couleurAccent, setCouleurAccent] = useState(branche?.couleurAccent || '#C98A2C')
  const [enregistre, setEnregistre] = useState(false)

  // Applique les couleurs à la page en direct pendant qu'on les choisit
  function handleCouleurPrimaire(val) {
    setCouleurPrimaire(val)
    document.documentElement.style.setProperty('--encre', val)
  }

  function handleCouleurAccent(val) {
    setCouleurAccent(val)
    document.documentElement.style.setProperty('--ocre', val)
  }

  async function enregistrer(e) {
    e.preventDefault()
    await updateDoc(doc(db, 'branches', brancheId), {
      nom: nomAffiche, logoUrl, couleurPrimaire, couleurAccent,
    })
    setEnregistre(true)
    setTimeout(() => setEnregistre(false), 2500)
  }

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Personnaliser l'application</h2>
        <form onSubmit={enregistrer} className="formulaire">
          <label className="champ-label">Nom affiché</label>
          <input type="text" value={nomAffiche} onChange={(e) => setNomAffiche(e.target.value)} className="champ-saisie" />

          <label className="champ-label">Logo (URL d'une image déjà en ligne)</label>
          <input
            type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
            className="champ-saisie" placeholder="https://…"
          />
          <p className="note" style={{ marginTop: '-0.5rem' }}>
            Héberge ton logo (par ex. sur Firebase Storage, Imgur, ou le site de l'église) et
            colle son lien ici.
          </p>

          <label className="champ-label">Couleur principale</label>
          <input
            type="color" value={couleurPrimaire}
            onChange={(e) => handleCouleurPrimaire(e.target.value)}
            className="champ-saisie" style={{ height: '2.5rem' }}
          />

          <label className="champ-label">Couleur d'accent</label>
          <input
            type="color" value={couleurAccent}
            onChange={(e) => handleCouleurAccent(e.target.value)}
            className="champ-saisie" style={{ height: '2.5rem' }}
          />

          <button type="submit" className="bouton-principal">Enregistrer</button>
        </form>
        {enregistre && <p className="note">Enregistré — les couleurs sont actives immédiatement.</p>}
      </section>

      <section className="carte">
        <h2 className="titre-carte">Aperçu</h2>
        <div
          style={{
            background: couleurPrimaire, color: '#fff', padding: '1rem', borderRadius: '4px',
            display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem',
          }}
        >
          {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: '32px', width: '32px', objectFit: 'contain' }} />}
          <span style={{ fontFamily: 'Fraunces, serif' }}>{nomAffiche || "Nom de l'église"}</span>
        </div>
        <button
          type="button"
          style={{
            background: couleurAccent, color: '#fff', border: 'none', borderRadius: '3px',
            padding: '0.55rem 1rem', fontFamily: 'inherit', cursor: 'default',
          }}
        >
          Exemple de bouton
        </button>
      </section>
    </div>
  )
}
