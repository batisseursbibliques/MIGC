import React, { useEffect, useState } from 'react'
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

// ─────────────────────────────────────────────────────────────────────────────
// Hook : vérifie si un titulaire est absent (pour l'adjoint/vice)
// roleId : ex. 'national', 'secretaire_general', 'tresorier_general', 'pasteur_<brancheId>'
// ─────────────────────────────────────────────────────────────────────────────
export function useAbsenceTitulaire(roleId) {
  const [absent, setAbsent] = useState(false)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    if (!roleId) { setChargement(false); return }
    return onSnapshot(doc(db, 'absences', roleId), (snap) => {
      setAbsent(snap.exists() && snap.data().absent === true)
      setChargement(false)
    })
  }, [roleId])

  return { absent, chargement }
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant bouton pour le TITULAIRE — déclarer son absence / retour
// ─────────────────────────────────────────────────────────────────────────────
export function BoutonAbsence({ roleId, nomTitulaire, nomAdjoint }) {
  const [absent, setAbsent] = useState(false)
  const [chargement, setChargement] = useState(true)
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    return onSnapshot(doc(db, 'absences', roleId), (snap) => {
      setAbsent(snap.exists() && snap.data().absent === true)
      setChargement(false)
    })
  }, [roleId])

  async function basculer() {
    setEnCours(true)
    await updateDoc(doc(db, 'absences', roleId), {
      absent: !absent,
      depuis: serverTimestamp(),
      roleId,
    }).catch(async () => {
      // Document n'existe pas encore — on le crée
      const { setDoc } = await import('firebase/firestore')
      await setDoc(doc(db, 'absences', roleId), {
        absent: true,
        depuis: serverTimestamp(),
        roleId,
      })
    })
    setEnCours(false)
  }

  if (chargement) return null

  return (
    <div className="abs-discret">
      <button
        onClick={basculer}
        disabled={enCours}
        className={absent ? 'absent' : ''}
        title={absent ? `Vous êtes déclaré absent : ${nomAdjoint} assure l'intérim. Touchez pour déclarer votre retour.` : `Vous êtes actif : ${nomAdjoint} est en lecture seule. Touchez pour vous déclarer absent.`}
      >
        <i />{enCours ? '…' : absent ? 'Absent · déclarer mon retour' : 'Actif'}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Bandeau informatif pour l'ADJOINT/VICE — lecture seule ou droits complets
// ─────────────────────────────────────────────────────────────────────────────
export function BandeauAdjoint({ absent, nomTitulaire }) {
  return (
    <div style={{
      background: absent ? '#FFF3CD' : '#EAF3FF',
      border: `1px solid ${absent ? 'var(--ocre)' : 'var(--ligne)'}`,
      borderRadius: '4px',
      padding: '0.65rem 1rem',
      marginBottom: '1.25rem',
    }}>
      {absent ? (
        <p style={{ margin: 0, color: '#7A5C00', fontWeight: 500 }}>
          🟡 {nomTitulaire} est absent — vous assurez l'intérim avec droits complets.
        </p>
      ) : (
        <p style={{ margin: 0, color: 'var(--texte-doux)' }}>
          👁 Vue en lecture seule — {nomTitulaire} est actif. Vous obtiendrez les droits complets lorsqu'il se déclare absent.
        </p>
      )}
    </div>
  )
}
