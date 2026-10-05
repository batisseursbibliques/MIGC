// Enveloppe de « firebase/firestore » (voir vite.config.js).
// Hors connexion, une écriture est déjà enregistrée sur l'appareil et visible à l'écran, mais sa promesse
// n'aboutit qu'au retour du réseau. On rend la main aussitôt pour que les formulaires ne restent pas bloqués.
import {
  addDoc as addDocReel, setDoc as setDocReel, updateDoc as updateDocReel, deleteDoc as deleteDocReel,
} from '@firebase/firestore'

export * from '@firebase/firestore'

const horsLigne = () => typeof navigator !== 'undefined' && navigator.onLine === false
const rapide = (p) => {
  if (!horsLigne()) return p
  p.catch(() => {})
  return Promise.race([p, new Promise((resolve) => setTimeout(() => resolve(undefined), 400))])
}

export const addDoc = (...a) => rapide(addDocReel(...a))
export const setDoc = (...a) => rapide(setDocReel(...a))
export const updateDoc = (...a) => rapide(updateDocReel(...a))
export const deleteDoc = (...a) => rapide(deleteDocReel(...a))
