import { initializeApp } from 'firebase/app'
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyAqiY6zLdKlrm511d_wv4ahsOAyhX-qf-g",
  authDomain: "missionchristg.firebaseapp.com",
  projectId: "missionchristg",
  storageBucket: "missionchristg.firebasestorage.app",
  messagingSenderId: "482124219290",
  appId: "1:482124219290:web:19bd6d9b53091712d67023"
}

// App principale (utilisateur connecté)
const app = initializeApp(firebaseConfig)
// Cache persistant sur l'appareil : les données déjà consultées restent lisibles sans connexion,
// et les ajouts faits hors ligne sont envoyés automatiquement au retour du réseau.
function creerBase() {
  try {
    return initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })
  } catch {
    return getFirestore(app) // navigateur sans stockage local : fonctionnement normal en ligne
  }
}
export const db = creerBase()
export const auth = getAuth(app)

// App secondaire pour créer des comptes sans déconnecter l'admin
let secondaryApp = null
export function getSecondaryApp() {
  if (!secondaryApp) {
    secondaryApp = initializeApp(firebaseConfig, 'secondary')
  }
  return secondaryApp
}
