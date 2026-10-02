// Script exécuté une seule fois par GitHub Actions pour créer le profil national
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8')
)

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

await db.collection('utilisateurs').doc(process.env.UID_NATIONAL).set({
  nom: 'Prof Georges AVUH — Archevêque Fondateur',
  role: 'national',
  brancheId: null,
  departementId: null,
})

console.log('Profil national créé avec succès')
process.exit(0)
