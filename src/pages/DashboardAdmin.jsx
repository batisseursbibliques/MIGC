import React, { useEffect, useState } from 'react'
import {
  collection, onSnapshot, query, orderBy, doc, updateDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import DashboardUtilisateurs from './DashboardUtilisateurs.jsx'

export default function DashboardAdmin({ profil , page = 'comptes'}) {
  const onglet = page

  return (
    <div>
      <h1 className="titre-page">MIGC — Gestion des comptes</h1>
      {onglet === 'comptes' && (
        <DashboardUtilisateurs role="admin" brancheId={null} />
      )}

      {onglet === 'liste' && <ListeComptes />}

      {onglet === 'reinit' && <ReinitMotDePasse />}
    </div>
  )
}

// ── Liste de tous les comptes avec blocage ───────────────────────────────────
function ListeComptes() {
  const [utilisateurs, setUtilisateurs] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'utilisateurs'), orderBy('nom'))
    return onSnapshot(q, (snap) => setUtilisateurs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  async function basculerBlocage(u) {
    await updateDoc(doc(db, 'utilisateurs', u.id), { bloque: !u.bloque })
  }

  const LABELS_ROLE = {
    national: 'Président', admin: 'Admin', secretaire_general: 'Secr. Général',
    tresorier_general: 'Trés. Général', pasteur: 'Pasteur', secretaire: 'Secrétaire',
    tresorier: 'Trésorier', departement: 'Responsable dept.',
  }

  return (
    <section className="carte">
      <h2 className="titre-carte">Tous les comptes ({utilisateurs.length})</h2>
      <ul className="liste">
        {utilisateurs.map((u) => (
          <li key={u.id} className="ligne-liste" style={{ opacity: u.bloque ? 0.5 : 1 }}>
            <div>
              <span style={{ fontWeight: 500 }}>{u.nom}</span>
              <span className="etiquette" style={{ marginLeft: '0.5rem' }}>{LABELS_ROLE[u.role] ?? u.role}</span>
              {u.pays && <span className="etiquette" style={{ marginLeft: '0.4rem' }}>{u.pays}</span>}
            </div>
            <button
              className={u.bloque ? 'bouton-secondaire' : 'bouton-lien'}
              style={u.bloque ? { background: 'var(--sauge)' } : { color: 'var(--erreur)' }}
              onClick={() => basculerBlocage(u)}
            >
              {u.bloque ? 'Débloquer' : 'Bloquer'}
            </button>
          </li>
        ))}
        {utilisateurs.length === 0 && <p className="note">Aucun compte enregistré.</p>}
      </ul>
    </section>
  )
}

// ── Instructions de réinitialisation ────────────────────────────────────────
function ReinitMotDePasse() {
  return (
    <section className="carte" style={{ maxWidth: '520px' }}>
      <h2 className="titre-carte">Réinitialiser un mot de passe</h2>
      <p className="note" style={{ marginBottom: '1rem' }}>
        Pour réinitialiser le mot de passe d'un utilisateur, rendez-vous dans la
        console Firebase → Authentication → cliquez sur l'utilisateur → "Envoyer
        l'e-mail de réinitialisation du mot de passe". L'utilisateur recevra un lien
        directement sur son adresse e-mail.
      </p>
      <p className="note">
        Si l'utilisateur n'a pas accès à son e-mail, vous pouvez modifier son mot
        de passe directement dans Firebase Authentication → l'utilisateur → "Modifier
        le mot de passe".
      </p>
      <a
        href="https://console.firebase.google.com/project/missionchristg/authentication/users"
        target="_blank"
        rel="noreferrer"
        className="bouton-principal"
        style={{ display: 'inline-block', marginTop: '1rem', textDecoration: 'none' }}
      >
        Ouvrir Firebase Authentication →
      </a>
    </section>
  )
}
