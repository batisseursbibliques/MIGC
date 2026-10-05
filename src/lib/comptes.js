// Création de comptes depuis l'application (par l'Archevêque, l'admin ou un pasteur)
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { doc, setDoc, updateDoc } from 'firebase/firestore'
import { db, getSecondaryApp } from './firebase.js'

export const ROLES_LOCAUX = ['pasteur', 'pasteur_suppleant', 'secretaire', 'secretaire_adjoint', 'tresorier', 'tresorier_adjoint', 'departement']

export async function creerCompte({ nom, email, motDePasse, role, brancheId = null, departementId = null, pays = null }) {
  const authSecondaire = getAuth(getSecondaryApp())
  try {
    const { user } = await createUserWithEmailAndPassword(authSecondaire, email, motDePasse)
    // mdpTemporaire : la personne est invitée à choisir son propre mot de passe dès la première connexion
    await setDoc(doc(db, 'utilisateurs', user.uid), { nom, role, brancheId, departementId, pays, mdpTemporaire: true })
    if (role === 'departement' && departementId && brancheId) {
      await updateDoc(doc(db, 'branches', brancheId, 'departements', departementId), { responsableUid: user.uid })
    }
    return { uid: user.uid }
  } finally {
    await authSecondaire.signOut().catch(() => {})
  }
}

export const messageErreurCompte = (err) => {
  const c = err?.code ?? ''
  if (c.includes('email-already-in-use')) return 'Cet e-mail est déjà utilisé par un autre compte.'
  if (c.includes('invalid-email')) return "L'adresse e-mail n'est pas valide."
  if (c.includes('weak-password')) return 'Le mot de passe est trop court (6 caractères minimum).'
  if (c.includes('network')) return 'Connexion indisponible : la création d\'un compte nécessite internet. Réessayez quand le réseau est revenu.'
  if (c.includes('permission')) return "Vous n'avez pas le droit d'effectuer cette opération."
  return `Création impossible (${err?.message ?? 'erreur'}).`
}

// Désigne le pasteur responsable d'une église (direction par un pasteur)
export const nommerPasteur = (brancheId, uid, nom) =>
  updateDoc(doc(db, 'branches', brancheId), { pasteurUid: uid, pasteurNom: nom, direction: 'pasteur' })

// L'Archevêque dirige lui-même l'église mère
export const reprendreDirection = (brancheId, uid, nom) =>
  updateDoc(doc(db, 'branches', brancheId), { pasteurUid: uid, pasteurNom: nom, direction: 'archeveque' })
