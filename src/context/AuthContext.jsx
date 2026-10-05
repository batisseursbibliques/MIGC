import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profil, setProfil] = useState(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'utilisateurs', u.uid))
          const p = snap.exists() ? { uid: u.uid, ...snap.data() } : null
          setProfil(p)
          try { if (p) localStorage.setItem('migc-profil', JSON.stringify(p)) } catch { /* stockage indisponible */ }
        } catch (e) {
          console.error('Erreur de lecture du profil :', e)
          // Hors connexion et profil jamais mis en cache : on reprend la dernière copie locale du même compte
          let copie = null
          try { copie = JSON.parse(localStorage.getItem('migc-profil') || 'null') } catch { /* ignoré */ }
          setProfil(copie && copie.uid === u.uid ? copie : null)
        }
      } else {
        setProfil(null)
      }
      setChargement(false)
    })
    return unsub
  }, [])

  const connexion = (email, motDePasse) => signInWithEmailAndPassword(auth, email, motDePasse)
  const deconnexion = () => { try { localStorage.removeItem('migc-profil') } catch { /* ignoré */ } return signOut(auth) }

  return (
    <AuthContext.Provider value={{ user, profil, chargement, connexion, deconnexion }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
