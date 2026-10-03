import React, { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from './lib/firebase.js'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import ChangerMotDePasse from './components/ChangerMotDePasse.jsx'
import { RappelsRecus } from './pages/RappelsEquipe.jsx'
import { collection, onSnapshot, query as requete, where as ou } from 'firebase/firestore'
import { db as baseDb } from './lib/firebase.js'
import { LOGO_MIGC } from './assets/logo-migc.js'
import Tiroir from './components/Tiroir.jsx'

import Login from './pages/Login.jsx'
import DashboardNational from './pages/DashboardNational.jsx'
import DashboardAdmin from './pages/DashboardAdmin.jsx'
import DashboardVicePresident from './pages/DashboardVicePresident.jsx'
import DashboardConseillerNational from './pages/DashboardConseillerNational.jsx'
import DashboardCommissaireComptes from './pages/DashboardCommissaireComptes.jsx'
import DashboardSecretaireGeneral from './pages/DashboardSecretaireGeneral.jsx'
import DashboardTresorierGeneral from './pages/DashboardTresorierGeneral.jsx'
import DashboardPasteur from './pages/DashboardPasteur.jsx'
import DashboardPasteurSuppleant from './pages/DashboardPasteurSuppleant.jsx'
import DashboardDepartement from './pages/DashboardDepartement.jsx'
import DashboardSecretaireBranche from './pages/DashboardSecretaireBranche.jsx'
import DashboardSecretaireAdjoint from './pages/DashboardSecretaireAdjoint.jsx'
import DashboardTresorierBranche from './pages/DashboardTresorierBranche.jsx'
import DashboardTresorierAdjoint from './pages/DashboardTresorierAdjoint.jsx'
import NotificationsBell from './pages/NotificationsBell.jsx'
import { BoutonAbsence } from './pages/GestionAbsence.jsx'

// ── Sections du tiroir par rôle ───────────────────────────────────────────────
const SECTIONS_PAR_ROLE = {
  national: [
    {
      label: 'Présidence',
      liens: [
        { icone: '🏠', texte: 'Tableau de bord', page: 'vue' },
        { icone: '⛪', texte: 'Églises locales', page: 'branches' },
        { icone: '📊', texte: 'Rapports financiers', page: 'rapports' },
        { icone: '✍️', texte: 'Messages', page: 'messages' },
        { icone: '📦', texte: 'Projets du BEN', page: 'projets' },
      ],
    },
    {
      label: 'Administration',
      liens: [
        { icone: '👥', texte: 'Utilisateurs', page: 'utilisateurs' },
        { icone: '📣', texte: 'Communication', page: 'communication' },
        { icone: '🌐', texte: 'Site public', page: 'site' },
        { icone: '🎨', texte: 'Apparence', page: 'apparence' },
      ],
    },
  ],
  admin: [
    {
      liens: [
        { icone: '➕', texte: 'Créer un compte', page: 'comptes' },
        { icone: '👥', texte: 'Tous les comptes', page: 'liste' },
        { icone: '🔑', texte: 'Réinitialisation', page: 'reinit' },
      ],
    },
  ],
  vice_president: [
    {
      liens: [
        { icone: '🏠', texte: 'Tableau de bord', page: 'dashboard' },
      ],
    },
  ],
  conseiller_national: [
    {
      liens: [
        { icone: '🏠', texte: 'Tableau de bord', page: 'accueil' },
        { icone: '📁', texte: 'Dossiers de conseil', page: 'dossiers' },
        { icone: '⚖️', texte: 'Gestion des conflits', page: 'conflits' },
        { icone: '🔒', texte: 'Notes confidentielles', page: 'notes' },
      ],
    },
  ],
  commissaire_comptes: [
    {
      liens: [
        { icone: '🔍', texte: 'Contrôle financier', page: 'controle' },
        { icone: '📄', texte: 'Rapport annuel', page: 'rapport' },
        { icone: '📝', texte: 'Observations', page: 'observations' },
      ],
    },
  ],
  secretaire_general: [
    {
      liens: [
        { icone: '🏠', texte: 'Tableau de bord', page: 'accueil' },
        { icone: '👥', texte: 'Membres (toutes)', page: 'membres' },
        { icone: '📋', texte: 'PV du BEN', page: 'pv' },
        { icone: '✉️', texte: 'Courrier du BEN', page: 'courrier' },
        { icone: '📊', texte: 'Rapports des branches', page: 'rapportsBranches' },
      ],
    },
  ],
  tresorier_general: [
    {
      liens: [
        { icone: '🏠', texte: 'Tableau de bord', page: 'accueil' },
        { icone: '💸', texte: 'Virements', page: 'virements' },
        { icone: '📊', texte: 'Consolidation', page: 'consolidation' },
        { icone: '🏦', texte: 'Caisses des branches', page: 'branches' },
        { icone: '📦', texte: 'Projets du BEN', page: 'projetsNationaux' },
        { icone: '📦', texte: 'Projets des branches', page: 'projetsBranches' },
      ],
    },
  ],
  pasteur: [
    {
      label: 'Supervision',
      liens: [
        { icone: '🏠', texte: 'Tableau de bord', page: 'supervision' },
        { icone: '🏢', texte: 'Départements', page: 'departements' },
        { icone: '🔔', texte: 'Rappels à l\'équipe', page: 'rappels' },
        { icone: '📦', texte: 'Projets', page: 'projets' },
        { icone: '✍️', texte: 'Mes messages', page: 'messages' },
        { icone: '🙏', texte: 'Cultes', page: 'cultes' },
        { icone: '📅', texte: 'Événements', page: 'evenements' },
      ],
    },
    {
      label: 'Suivi de l\'équipe (lecture)',
      liens: [
        { icone: '📋', texte: 'Secrétariat', page: 'secretariat' },
        { icone: '💰', texte: 'Trésorerie', page: 'tresorerie' },
        { icone: '📣', texte: 'Communication', page: 'communication' },
        { icone: '📊', texte: 'Rapports', page: 'rapports' },
      ],
    },
    {
      label: 'Administration',
      liens: [
        { icone: '👥', texte: 'Utilisateurs', page: 'utilisateurs' },
        { icone: '🎨', texte: 'Apparence', page: 'apparence' },
      ],
    },
  ],
  pasteur_suppleant: [
    { liens: [{ icone: '🏠', texte: 'Tableau de bord', page: 'dashboard' }] },
  ],
  secretaire: [
    {
      liens: [
        { icone: '👥', texte: 'Membres', page: 'membres' },
        { icone: '📋', texte: 'Procès-verbaux', page: 'pv' },
        { icone: '✉️', texte: 'Courrier', page: 'courrier' },
      ],
    },
  ],
  secretaire_adjoint: [
    { liens: [{ icone: '🏠', texte: 'Tableau de bord', page: 'dashboard' }] },
  ],
  tresorier: [
    {
      liens: [
        { icone: '💰', texte: 'Caisse', page: 'caisse' },
        { icone: '📊', texte: 'Rapport financier', page: 'rapport' },
        { icone: '📦', texte: 'Projets', page: 'projets' },
      ],
    },
  ],
  tresorier_adjoint: [
    { liens: [{ icone: '🏠', texte: 'Tableau de bord', page: 'dashboard' }] },
  ],
  departement: [
    {
      liens: [
        { icone: '📝', texte: 'Comptes-rendus', page: 'comptes-rendus' },
        { icone: '👥', texte: 'Membres', page: 'membres' },
        { icone: '📋', texte: 'Tâches', page: 'taches' },
      ],
    },
  ],
}

const LABEL_ROLE = {
  national: 'Archevêque Fondateur (Président du BEN)',
  admin: 'Gestionnaire de comptes',
  vice_president: 'Vice-Président',
  conseiller_national: 'Conseiller du BEN',
  commissaire_comptes: 'Commissaire aux Comptes',
  secretaire_general: 'Secrétaire Général',
  tresorier_general: 'Trésorier Général',
  pasteur: 'Pasteur Responsable',
  pasteur_suppleant: 'Pasteur Suppléant',
  secretaire: 'Secrétaire Local',
  secretaire_adjoint: 'Secrétaire Adjoint',
  tresorier: 'Trésorier Local',
  tresorier_adjoint: 'Trésorier Adjoint',
  departement: 'Responsable de Ministère',
}

const ROLES_CONNUS = Object.keys(SECTIONS_PAR_ROLE)

function Contenu() {
  const { user, profil, chargement, deconnexion } = useAuth()
  const [tiroirOuvert, setTiroirOuvert] = useState(false)
  const [pageActive, setPageActive] = useState(null)
  const [mdpOuvert, setMdpOuvert] = useState(false)
  const [mere, setMere] = useState(null) // église mère (vue par l'Archevêque)
  useEffect(() => {
    if (profil?.role !== 'national') { setMere(null); return }
    return onSnapshot(requete(collection(baseDb, 'branches'), ou('mere', '==', true)), (s) => setMere(s.docs[0] ? { id: s.docs[0].id, ...s.docs[0].data() } : null), () => setMere(null))
  }, [profil?.role])
  // Mot de passe temporaire : on invite l'utilisateur à le changer dès la première connexion
  useEffect(() => { if (profil?.mdpTemporaire) setMdpOuvert(true) }, [profil])

  // Page par défaut selon le rôle
  useEffect(() => {
    if (!profil) return
    const sections = SECTIONS_PAR_ROLE[profil.role]
    if (sections?.length > 0 && sections[0].liens?.length > 0) {
      setPageActive(sections[0].liens[0].page)
    }
  }, [profil?.role])

  // Personnalisation couleurs branche
  useEffect(() => {
    if (!profil?.brancheId) return
    getDoc(doc(db, 'branches', profil.brancheId)).then((snap) => {
      if (!snap.exists()) return
      const b = snap.data()
      if (b.couleurPrimaire) document.documentElement.style.setProperty('--encre', b.couleurPrimaire)
      if (b.couleurAccent) document.documentElement.style.setProperty('--ocre', b.couleurAccent)
    })
  }, [profil?.brancheId])

  if (chargement) return <div className="ecran-centre">Chargement…</div>
  if (!user) return <Login />

  if (!profil) {
    return (
      <div className="ecran-centre">
        <p>Ce compte n'a pas encore de profil configuré. Contactez le gestionnaire de comptes.</p>
        <button className="bouton-lien" onClick={deconnexion}>Se déconnecter</button>
      </div>
    )
  }

  if (!ROLES_CONNUS.includes(profil.role)) {
    return (
      <div className="ecran-centre">
        <p>Rôle non reconnu ({profil.role}). Contactez le gestionnaire de comptes.</p>
        <button className="bouton-lien" onClick={deconnexion}>Se déconnecter</button>
      </div>
    )
  }

  let sections = SECTIONS_PAR_ROLE[profil.role] ?? []
  if (profil.role === 'national' && mere) {
    const dirige = mere.direction !== 'pasteur'
    const liens = [
      { icone: '⛪', texte: 'Tableau de bord', page: 'mere:supervision' },
      { icone: '👥', texte: 'Membres', page: 'mere:membres' },
      { icone: '🙏', texte: 'Cultes', page: 'mere:cultes' },
      { icone: '📅', texte: 'Événements', page: 'mere:evenements' },
      { icone: '🏢', texte: 'Départements', page: 'mere:departements' },
      ...(dirige ? [{ icone: '🔔', texte: "Rappels à l'équipe", page: 'mere:rappels' }] : []),
      { icone: '📋', texte: 'Secrétariat', page: 'mere:secretariat' },
      { icone: '💰', texte: 'Trésorerie', page: 'mere:tresorerie' },
      ...(dirige ? [{ icone: '✍️', texte: 'Mes messages', page: 'mere:messages' }] : []),
    ]
    sections = [sections[0], { label: dirige ? `Église mère — ${mere.nom} (vous la dirigez)` : `Église mère — ${mere.nom} (supervision)`, liens }, ...sections.slice(1)]
  }
  const labelRole = LABEL_ROLE[profil.role] ?? profil.role

  return (
    <div className="app-shell">
      {/* En-tête */}
      <header className="entete">
        <div className="entete-logo">
          <img src={LOGO_MIGC} alt="Logo MIGC" style={{ height: '36px', width: '36px', objectFit: 'contain', borderRadius: '50%' }} />
          <span>MIGC</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <NotificationsBell role={profil.role} brancheId={profil.brancheId} />
          <button
            className={`btn-hamburger${tiroirOuvert ? ' ouvert' : ''}`}
            onClick={() => setTiroirOuvert(!tiroirOuvert)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </header>

      {/* Tiroir */}
      <Tiroir
        ouvert={tiroirOuvert}
        onFermer={() => setTiroirOuvert(false)}
        sections={sections}
        pageActive={pageActive}
        onNaviguer={setPageActive}
        nom={profil.nom}
        role={labelRole}
        onDeconnexion={deconnexion}
        onChangerMdp={() => setMdpOuvert(true)}
      />

      {/* Contenu */}
      <main className="contenu">
        <PageContenu profil={profil} pageActive={pageActive} deconnexion={deconnexion} onNaviguer={setPageActive} mere={mere} />
        {mdpOuvert && <ChangerMotDePasse onFermer={() => setMdpOuvert(false)} />}
      </main>
    </div>
  )
}

// ── Routeur de page ───────────────────────────────────────────────────────────
function PageContenu({ profil, pageActive, deconnexion, onNaviguer, mere }) {
  const role = profil.role

  if (role === 'national') return <DashboardNationalAvecAbsence profil={profil} page={pageActive} deconnexion={deconnexion} onNaviguer={onNaviguer} mere={mere} />
  if (role === 'admin') return <DashboardAdmin profil={profil} page={pageActive} />
  if (role === 'vice_president') return <DashboardVicePresident profil={profil} />
  if (role === 'conseiller_national') return <DashboardConseillerNational profil={profil} page={pageActive} onNaviguer={onNaviguer} />
  if (role === 'commissaire_comptes') return <DashboardCommissaireComptes profil={profil} page={pageActive} />
  if (role === 'secretaire_general') return <DashboardSecretaireGeneral profil={profil} page={pageActive} onNaviguer={onNaviguer} />
  if (role === 'tresorier_general') return <DashboardTresorierGeneral profil={profil} page={pageActive} onNaviguer={onNaviguer} />
  if (role === 'pasteur') return <DashboardPasteur profil={profil} page={pageActive} onNaviguer={onNaviguer} />
  if (role === 'pasteur_suppleant') return <DashboardPasteurSuppleant profil={profil} />
  if (role === 'departement') return <><RappelsRecus profil={profil} /><DashboardDepartement profil={profil} page={pageActive} /></>
  if (role === 'secretaire') return <><RappelsRecus profil={profil} /><DashboardSecretaireBranche profil={profil} page={pageActive} /></>
  if (role === 'secretaire_adjoint') return <DashboardSecretaireAdjoint profil={profil} />
  if (role === 'tresorier') return <><RappelsRecus profil={profil} /><DashboardTresorierBranche profil={profil} page={pageActive} /></>
  if (role === 'tresorier_adjoint') return <DashboardTresorierAdjoint profil={profil} />
  return null
}

function DashboardNationalAvecAbsence({ profil, page, deconnexion, onNaviguer, mere }) {
  return (
    <div>
      <BoutonAbsence roleId="national" nomTitulaire={profil?.nom ?? 'Président'} nomAdjoint="le Vice-Président" />
      <DashboardNational page={page} deconnexion={deconnexion} onNaviguer={onNaviguer} mere={mere} />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Contenu />
    </AuthProvider>
  )
}
