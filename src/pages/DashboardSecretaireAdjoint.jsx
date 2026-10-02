import React from 'react'
import { useAbsenceTitulaire, BandeauAdjoint } from './GestionAbsence.jsx'
import DashboardSecretaireBranche from './DashboardSecretaireBranche.jsx'

// Le Secrétaire Adjoint voit le même dashboard que le Secrétaire Local.
// Il obtient les droits complets uniquement quand le Secrétaire se déclare absent.
export default function DashboardSecretaireAdjoint({ profil }) {
  const roleId = `secretaire_${profil.brancheId}`
  const { absent, chargement } = useAbsenceTitulaire(roleId)

  if (chargement) return <div className="ecran-centre">Chargement…</div>

  return (
    <div>
      <BandeauAdjoint absent={absent} nomTitulaire="le Secrétaire Local" />
      <DashboardSecretaireBranche profil={profil} lectureSeule={!absent} />
    </div>
  )
}
