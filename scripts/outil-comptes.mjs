// Outil d'administration (exécuté par GitHub Actions avec la clé du compte de service).
// ACTION=inspecter  : liste comptes, fiches et églises (e-mails masqués) dans les annotations du workflow
// ACTION=supprimer  : supprime les comptes listés dans UIDS (compte Auth + fiche + sous-collections + données liées)
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SA)) })
const auth = getAuth(); const db = getFirestore()
const note = (titre, lignes) => console.log(`::notice title=${titre}::${lignes.join('%0A')}`)
const masque = (e = '') => { const [a, d] = e.split('@'); return `${a.slice(0, 2)}***@${d ?? ''}` }

async function inspecter() {
  const users = (await auth.listUsers(1000)).users
  const fiches = await db.collection('utilisateurs').get()
  const branches = await db.collection('branches').get()
  note('Comptes Auth', users.map((u) => `${u.uid} | ${masque(u.email)} | ${u.displayName ?? ''}`))
  note('Fiches utilisateurs', fiches.docs.map((d) => `${d.id} | ${d.data().nom} | ${d.data().role} | branche=${d.data().brancheId ?? '-'}`))
  const lignes = []
  for (const b of branches.docs) {
    const d = b.data(); const sous = {}
    for (const c of await b.ref.listCollections()) sous[c.id] = (await c.count().get()).data().count
    lignes.push(`${b.id} | ${d.nom} | ${d.ville ?? ''} | pasteur=${d.pasteurNom ?? '-'} | mere=${d.mere ?? false} | ${JSON.stringify(sous)}`)
  }
  note('Églises', lignes.length ? lignes : ['(aucune)'])
  const absences = await db.collection('absences').get()
  note('Absences', absences.docs.length ? absences.docs.map((d) => d.id) : ['(aucune)'])
}

async function supprimerCollection(ref) {
  for (const d of (await ref.get()).docs) await db.recursiveDelete(d.ref)
}

async function supprimer() {
  const uids = (process.env.UIDS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const fait = []
  for (const uid of uids) {
    const fiche = await db.collection('utilisateurs').doc(uid).get()
    if (fiche.exists && ['national'].includes(fiche.data().role)) { fait.push(`${uid} : REFUSÉ (compte national)`); continue }
    const brancheId = fiche.exists ? fiche.data().brancheId : null
    try { await auth.deleteUser(uid) } catch (e) { fait.push(`${uid} : Auth ${e.code ?? e.message}`) }
    if (fiche.exists) await db.recursiveDelete(fiche.ref)   // fiche + messages + notes
    if (brancheId) {
      await db.collection('absences').doc(`pasteur_${brancheId}`).delete().catch(() => {})
      await db.collection('absences').doc(`secretaire_${brancheId}`).delete().catch(() => {})
      await db.collection('absences').doc(`tresorier_${brancheId}`).delete().catch(() => {})
    }
    fait.push(`${uid} : supprimé (compte, fiche, messages, notes)`)
  }
  note('Suppression', fait.length ? fait : ['(rien à faire)'])
}

// ACTION=mere : désigne l'église mère (BRANCHE) et son pasteur principal (UIDS = UID de l'Archevêque)
async function designerMere() {
  const brancheId = process.env.BRANCHE; const uid = (process.env.UIDS ?? '').split(',')[0].trim()
  const fiche = await db.collection('utilisateurs').doc(uid).get()
  if (!fiche.exists || fiche.data().role !== 'national') { note('Église mère', ['REFUSÉ : l\'UID fourni n\'est pas celui du compte national']); return }
  await db.collection('branches').doc(brancheId).set({ mere: true, direction: 'archeveque', pasteurUid: uid, pasteurNom: fiche.data().nom }, { merge: true })
  note('Église mère', [`${brancheId} désignée église mère, dirigée par ${fiche.data().nom}`])
}

if (process.env.ACTION === 'supprimer') await supprimer()
else if (process.env.ACTION === 'mere') await designerMere()
else await inspecter()
