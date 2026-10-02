import React, { useEffect, useState } from 'react'
import { collection, collectionGroup, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

export default function NotificationsBell({ role, brancheId }) {
  const [ouvert, setOuvert] = useState(false)
  const [alertes, setAlertes] = useState([])

  useEffect(() => {
    if (role === 'national') {
      const q = query(collectionGroup(db, 'virements'), where('statut', '==', 'declare'))
      return onSnapshot(q, (snap) => {
        setAlertes(snap.size > 0 ? [`${snap.size} virement(s) en attente de validation`] : [])
      })
    }

    if (role === 'pasteur' && brancheId) {
      // On charge d'abord le seuil, puis on active les listeners de caisse et de cultes.
      // Cela évite que les listeners se déclenchent avant que le seuil soit connu,
      // ce qui faisait manquer l'alerte au premier chargement.
      let seuil = null
      let solde = 0
      let cultesSansPresence = 0
      let unsubCaisse = null
      let unsubCultes = null

      const majAlertes = () => {
        const liste = []
        if (seuil != null && solde > seuil) {
          liste.push(`Le solde de la caisse (${solde.toLocaleString('fr-FR')} FCFA) dépasse le seuil autorisé`)
        }
        if (cultesSansPresence > 0) {
          liste.push(`${cultesSansPresence} culte(s) passé(s) sans présence enregistrée`)
        }
        setAlertes(liste)
      }

      getDoc(doc(db, 'branches', brancheId)).then((snap) => {
        seuil = snap.exists() ? (snap.data().seuilSolde ?? null) : null

        unsubCaisse = onSnapshot(collection(db, 'branches', brancheId, 'caisse'), (snap) => {
          solde = snap.docs.reduce((acc, d) => {
            const m = d.data()
            return m.type === 'depense' ? acc - m.montant : acc + m.montant
          }, 0)
          majAlertes()
        })

        // Date locale du jour (et non UTC) pour éviter un décalage selon le fuseau horaire
        const now = new Date()
        const aujourdhui = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        unsubCultes = onSnapshot(collection(db, 'branches', brancheId, 'cultes'), (snap) => {
          cultesSansPresence = snap.docs.filter((d) => {
            const c = d.data()
            return c.date < aujourdhui && !c.presence
          }).length
          majAlertes()
        })
      })

      return () => {
        if (unsubCaisse) unsubCaisse()
        if (unsubCultes) unsubCultes()
      }
    }

    setAlertes([])
    return undefined
  }, [role, brancheId])

  if (role === 'departement') return null

  return (
    <div style={{ position: 'relative' }}>
      <button className="bouton-lien" onClick={() => setOuvert(!ouvert)} style={{ position: 'relative' }}>
        🔔{alertes.length > 0 && (
          <span style={{
            background: '#C98A2C', color: '#fff', borderRadius: '50%', fontSize: '0.7rem',
            padding: '0 5px', marginLeft: '4px',
          }}>{alertes.length}</span>
        )}
      </button>
      {ouvert && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem',
          background: '#fff', color: '#232323', border: '1px solid #E4DFD1', borderRadius: '4px',
          padding: '0.75rem 1rem', width: '260px', zIndex: 10,
        }}>
          {alertes.length === 0 && <p className="note">Aucune alerte pour l'instant.</p>}
          {alertes.map((a, i) => <p key={i} className="note" style={{ margin: '0.4rem 0' }}>{a}</p>)}
        </div>
      )}
    </div>
  )
}
