import React from 'react'
import { useAbsenceTitulaire, BandeauAdjoint } from './GestionAbsence.jsx'
import DashboardTresorierBranche from './DashboardTresorierBranche.jsx'

// Le Trésorier Adjoint voit le même dashboard que le Trésorier Local.
// Il obtient les droits complets uniquement quand le Trésorier se déclare absent.
export default function DashboardTresorierAdjoint({ profil }) {
  const roleId = `tresorier_${profil.brancheId}`
  const { absent, chargement } = useAbsenceTitulaire(roleId)

  if (chargement) return <div className="ecran-centre">Chargement…</div>

  return (
    <div>
      <BandeauAdjoint absent={absent} nomTitulaire="le Trésorier Local" />
      <DashboardTresorierBranche profil={profil} lectureSeule={!absent} />
    </div>
  )
}
