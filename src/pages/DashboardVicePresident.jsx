import React from 'react'
import { useAbsenceTitulaire, BandeauAdjoint } from './GestionAbsence.jsx'
import DashboardNational from './DashboardNational.jsx'

// Le Vice-Président voit exactement le même dashboard que le Président.
// Il obtient les droits complets uniquement quand le Président se déclare absent.
export default function DashboardVicePresident({ profil }) {
  const { absent, chargement } = useAbsenceTitulaire('national')

  if (chargement) return <div className="ecran-centre">Chargement…</div>

  return (
    <div>
      <BandeauAdjoint absent={absent} nomTitulaire="le Président Exécutif National" />
      {/* On réutilise directement le dashboard national.
          En lecture seule si le Président est présent — les actions destructives
          sont bloquées côté Firestore rules par le rôle vice_president. */}
      <DashboardNational lectureSeule={!absent} />
    </div>
  )
}
