import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { LOGO_MIGC } from '../assets/logo-migc.js'

export default function Login() {
  const { connexion } = useAuth()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)

  async function valider(e) {
    e.preventDefault()
    setErreur('')
    setEnCours(true)
    try {
      await connexion(email, motDePasse)
    } catch (err) {
      setErreur("Identifiants incorrects. Vérifiez l'e-mail et le mot de passe fournis par le responsable.")
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="ecran-centre" style={{ background: 'var(--papier)' }}>
      <form className="carte-connexion" onSubmit={valider}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img
            src={LOGO_MIGC}
            alt="Logo MIGC"
            style={{ width: '90px', height: '90px', objectFit: 'contain', borderRadius: '50%', marginBottom: '0.75rem' }}
          />
          <h1 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--encre)', fontFamily: 'Fraunces, serif' }}>
            MIGC
          </h1>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--texte-doux)', letterSpacing: '0.03em' }}>
            Mission Internationale de la Gloire de Christ
          </p>
        </div>

        <p className="sous-titre" style={{ textAlign: 'center' }}>Espace de gestion — Connexion</p>

        <label className="champ-label" htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="champ-saisie"
        />

        <label className="champ-label" htmlFor="mdp">Mot de passe</label>
        <input
          id="mdp"
          type="password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          required
          className="champ-saisie"
        />

        {erreur && <p className="message-erreur">{erreur}</p>}

        <button type="submit" className="bouton-principal" disabled={enCours}>
          {enCours ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}
