import React, { useState } from 'react'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { auth } from '../lib/firebase.js'

export default function ChangerMotDePasse({ onFermer }) {
  const [actuel, setActuel] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [confirme, setConfirme] = useState('')
  const [msg, setMsg] = useState(null)
  const [envoi, setEnvoi] = useState(false)

  async function valider(e) {
    e.preventDefault()
    if (nouveau.length < 6) return setMsg({ ok: false, t: 'Le nouveau mot de passe doit avoir au moins 6 caractères.' })
    if (nouveau !== confirme) return setMsg({ ok: false, t: 'Les deux nouveaux mots de passe ne sont pas identiques.' })
    setEnvoi(true)
    try {
      const u = auth.currentUser
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, actuel))
      await updatePassword(u, nouveau)
      setMsg({ ok: true, t: 'Mot de passe modifié.' })
      setActuel(''); setNouveau(''); setConfirme('')
    } catch (err) {
      const faux = ['auth/wrong-password', 'auth/invalid-credential'].includes(err.code)
      setMsg({ ok: false, t: faux ? 'Le mot de passe actuel est incorrect.' : 'Modification impossible. Réessayez.' })
    }
    setEnvoi(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onFermer}>
      <form className="carte" onClick={(e) => e.stopPropagation()} onSubmit={valider} style={{ width: '100%', maxWidth: '24rem', background: '#fff' }}>
        <h2 className="titre-carte">Changer mon mot de passe</h2>
        <input className="champ-saisie" type="password" placeholder="Mot de passe actuel" value={actuel} onChange={(e) => setActuel(e.target.value)} required autoComplete="current-password" />
        <input className="champ-saisie" type="password" placeholder="Nouveau mot de passe" value={nouveau} onChange={(e) => setNouveau(e.target.value)} required autoComplete="new-password" style={{ marginTop: '.6rem' }} />
        <input className="champ-saisie" type="password" placeholder="Confirmer le nouveau mot de passe" value={confirme} onChange={(e) => setConfirme(e.target.value)} required autoComplete="new-password" style={{ marginTop: '.6rem' }} />
        {msg && <p style={{ color: msg.ok ? '#2E8B57' : '#A6402D' }}>{msg.t}</p>}
        <div style={{ display: 'flex', gap: '.6rem', marginTop: '.8rem' }}>
          <button className="bouton-principal" disabled={envoi}>{envoi ? 'Patientez…' : 'Valider'}</button>
          <button type="button" className="bouton-secondaire" onClick={onFermer}>Fermer</button>
        </div>
      </form>
    </div>
  )
}
