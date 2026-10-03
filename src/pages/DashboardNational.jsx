import React, { useEffect, useState } from 'react'
import {
  collection, collectionGroup, onSnapshot, query, where, orderBy, doc, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import DashboardCommunication from './DashboardCommunication.jsx'
import DashboardBranches from './DashboardBranches.jsx'
import DashboardRapports from './DashboardRapports.jsx'
import GestionProjets from './GestionProjets.jsx'
import VueMessagesPresident from './VueMessagesPresident.jsx'
import GestionMessages from './GestionMessages.jsx'
import DashboardUtilisateurs from './DashboardUtilisateurs.jsx'
import GestionSite from './GestionSite.jsx'
import TableauDeBordNational from './TableauDeBordNational.jsx'
import DashboardPasteur from './DashboardPasteur.jsx'

export default function DashboardNational({ page = 'vue', deconnexion, onNaviguer = () => {}, mere = null }) {
  const { user, profil } = useAuth()
  const onglet = page ?? 'vue' // la page vaut null au tout premier affichage
  const [branches, setBranches] = useState([])
  const [virements, setVirements] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'branches'), orderBy('nom'))
    return onSnapshot(q, (snap) => setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  async function validerVirement(v) {
    const ref = doc(db, 'branches', v.brancheId, 'virements', v.id)
    await updateDoc(ref, {
      statut: 'valide',
      valideParUid: user.uid,
      dateValidation: serverTimestamp(),
    })
  }

  // Pages de l'église mère : l'Archevêque agit comme pasteur responsable (ou en lecture seule s'il a nommé un pasteur)
  if (onglet.startsWith('mere:')) {
    if (!mere) return <p className="note">Aucune église mère n'est désignée. Créez-la dans « Églises locales ».</p>
    return (
      <DashboardPasteur
        profil={{ ...profil, role: 'pasteur', brancheId: mere.id, uid: user.uid, archeveque: true }}
        page={onglet.slice(5)}
        lectureSeule={mere.direction === 'pasteur'}
        onNaviguer={(p) => onNaviguer(`mere:${p}`)}
      />
    )
  }

  return (
    <div>
      {onglet === 'vue' && (
        <TableauDeBordNational profil={profil} branches={branches} onNaviguer={onNaviguer} onValider={validerVirement} />
      )}

      {onglet === 'branches' && (
        <DashboardBranches branches={branches} />
      )}

      {onglet === 'rapports' && (
        <DashboardRapports />
      )}

      {onglet === 'utilisateurs' && (
        <DashboardUtilisateurs role="national" />
      )}

      {onglet === 'site' && <GestionSite />}

      {onglet === 'communication' && (
        <DashboardCommunication uid={user.uid} peutPublierNational={true} />
      )}

      {onglet === 'messages' && (
        <VueMessagesNational uid={user.uid} nom={profil?.nom ?? 'Président'} />
      )}

      {onglet === 'projets' && (
        <VueProjetsNational />
      )}
    </div>
  )
}

// Vue Messages du président : ses propres messages + accordéon des autres pasteurs
function VueMessagesNational({ uid, nom }) {
  const [sousOnglet, setSousOnglet] = useState('mes-messages')

  return (
    <div>
      <nav className="onglets" style={{ marginBottom: '1.25rem' }}>
        <button
          className={sousOnglet === 'mes-messages' ? 'onglet actif' : 'onglet'}
          onClick={() => setSousOnglet('mes-messages')}
        >
          Mes messages
        </button>
        <button
          className={sousOnglet === 'pasteurs' ? 'onglet actif' : 'onglet'}
          onClick={() => setSousOnglet('pasteurs')}
        >
          Messages des pasteurs
        </button>
      </nav>

      {sousOnglet === 'mes-messages' && (
        <GestionMessages pasteurUid={uid} pasteurNom={nom} lectureSeule={false} />
      )}

      {sousOnglet === 'pasteurs' && <VueMessagesPresident />}
    </div>
  )
}

function VueProjetsNational() {
  const [vue, setVue] = useState('national')
  const [branches, setBranches] = useState([])
  const [brancheSelectionnee, setBrancheSelectionnee] = useState(null)
  const { user } = useAuth()

  useEffect(() => onSnapshot(collection(db, 'branches'), (snap) => {
    const b = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    setBranches(b)
    if (b.length > 0 && !brancheSelectionnee) setBrancheSelectionnee(b[0].id)
  }), [])

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button className={vue === 'national' ? 'bouton-principal' : 'bouton-secondaire'} onClick={() => setVue('national')}>
          Projets du BEN
        </button>
        <button className={vue === 'branches' ? 'bouton-principal' : 'bouton-secondaire'} onClick={() => setVue('branches')}>
          Projets des églises locales
        </button>
      </div>

      {vue === 'national' && (
        <GestionProjets brancheId={null} uid={user?.uid} lectureSeule={true} />
      )}

      {vue === 'branches' && (
        <div>
          <select
            value={brancheSelectionnee || ''}
            onChange={(e) => setBrancheSelectionnee(e.target.value)}
            className="champ-saisie"
            style={{ maxWidth: '300px', marginBottom: '1rem' }}
          >
            {branches.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
          </select>
          {brancheSelectionnee && (
            <GestionProjets brancheId={brancheSelectionnee} uid={null} lectureSeule={true} />
          )}
        </div>
      )}
    </div>
  )
}
