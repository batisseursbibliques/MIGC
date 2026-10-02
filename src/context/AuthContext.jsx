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
          setProfil(snap.exists() ? { uid: u.uid, ...snap.data() } : null)
        } catch (e) {
          console.error('Erreur de lecture du profil :', e)
          setProfil(null)
        }
      } else {
        setProfil(null)
      }
      setChargement(false)
    })
    return unsub
  }, [])

  const connexion = (email, motDePasse) => signInWithEmailAndPassword(auth, email, motDePasse)
  const deconnexion = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, profil, chargement, connexion, deconnexion }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
