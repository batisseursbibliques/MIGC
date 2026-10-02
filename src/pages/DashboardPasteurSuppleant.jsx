import React from 'react'
import { useAbsenceTitulaire, BandeauAdjoint } from './GestionAbsence.jsx'
import DashboardPasteur from './DashboardPasteur.jsx'

// Le Pasteur Suppléant voit le même dashboard que le Pasteur Responsable.
// Il obtient les droits complets uniquement quand le Pasteur se déclare absent.
export default function DashboardPasteurSuppleant({ profil }) {
  const roleId = `pasteur_${profil.brancheId}`
  const { absent, chargement } = useAbsenceTitulaire(roleId)

  if (chargement) return <div className="ecran-centre">Chargement…</div>

  return (
    <div>
      <BandeauAdjoint absent={absent} nomTitulaire="le Pasteur Responsable" />
      <DashboardPasteur profil={profil} lectureSeule={!absent} />
    </div>
  )
}
