import React, { useEffect, useState } from 'react'
import {
  collection, addDoc, onSnapshot, query, orderBy, doc, getDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import DashboardCultes from './DashboardCultes.jsx'
import SuiviMembre from './SuiviMembre.jsx'
import DashboardCommunication from './DashboardCommunication.jsx'
import DashboardDepartements from './DashboardDepartements.jsx'
import DashboardEvenements from './DashboardEvenements.jsx'
import DashboardRapports from './DashboardRapports.jsx'
import DashboardUtilisateurs from './DashboardUtilisateurs.jsx'
import DashboardApparence from './DashboardApparence.jsx'
import GestionProjets from './GestionProjets.jsx'
import GestionMessages from './GestionMessages.jsx'
import { BoutonAbsence } from './GestionAbsence.jsx'
import BoutonPdf from '../components/BoutonPdf.jsx'
import { exporterMembres, exporterPVs, exporterCourriers, exporterJournalCaisse } from '../lib/exports.js'
import RappelsEquipe from './RappelsEquipe.jsx'
import { AccueilPasteur } from './AccueilRoles.jsx'
const TYPES_MOUVEMENT = [
  { valeur: 'dime', label: 'Dîme' },
  { valeur: 'collecte', label: 'Collecte' },
  { valeur: 'don', label: 'Don' },
  { valeur: 'depense', label: 'Dépense' },
]

export default function DashboardPasteur({ profil, lectureSeule = false, page = 'caisse', onNaviguer = () => {} }) {
  const brancheId = profil.brancheId
  const onglet = page
  const [branche, setBranche] = useState(null)
  const [mouvements, setMouvements] = useState([])
  const [membres, setMembres] = useState([])

  useEffect(() => {
    getDoc(doc(db, 'branches', brancheId)).then((snap) => {
      if (snap.exists()) setBranche(snap.data())
    })
  }, [brancheId])

  useEffect(() => {
    const q = query(collection(db, 'branches', brancheId, 'caisse'), orderBy('date', 'desc'))
    return onSnapshot(q, (snap) => setMouvements(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [brancheId])

  useEffect(() => {
    const q = query(collection(db, 'branches', brancheId, 'membres'), orderBy('nom'))
    return onSnapshot(q, (snap) => setMembres(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [brancheId])

  const solde = mouvements.reduce((acc, m) => {
    return m.type === 'depense' ? acc - m.montant : acc + m.montant
  }, 0)

  const seuil = branche?.seuilSolde ?? null
  const depasseSeuil = seuil != null && solde > seuil

  return (
    <div>
      {!lectureSeule && (
        <BoutonAbsence
          roleId={`pasteur_${brancheId}`}
          nomTitulaire={profil.nom}
          nomAdjoint="le Pasteur Suppléant"
        />
      )}
      {onglet !== 'supervision' && <h1 className="titre-page">{branche?.nom ?? 'Mon église locale'}</h1>}

      {onglet === 'supervision' && (
        <AccueilPasteur profil={profil} branche={branche} mouvements={mouvements} membres={membres} solde={solde} seuil={seuil} depasseSeuil={depasseSeuil} onNaviguer={onNaviguer} />
      )}

      {onglet === 'rappels' && <RappelsEquipe profil={profil} />}

      {onglet === 'caisse' && (
        <CaissePasteur
          eglise={branche?.nom}
          brancheId={brancheId}
          mouvements={mouvements}
          solde={solde}
          seuil={seuil}
          depasseSeuil={depasseSeuil}
          uid={profil.uid}
        />
      )}

      {onglet === 'membres' && (
        <MembresPasteur brancheId={brancheId} membres={membres} uid={profil.uid} eglise={branche?.nom} />
      )}

      {onglet === 'cultes' && (
        <DashboardCultes profil={{ brancheId, uid: profil.uid }} />
      )}

      {onglet === 'departements' && (
        <DashboardDepartements brancheId={brancheId} />
      )}

      {onglet === 'communication' && (
        <DashboardCommunication brancheId={brancheId} uid={profil.uid} peutPublierBranche={true} />
      )}

      {onglet === 'evenements' && (
        <DashboardEvenements brancheId={brancheId} />
      )}

      {onglet === 'rapports' && (
        <DashboardRapports brancheId={brancheId} />
      )}

      {onglet === 'secretariat' && (
        <LectureSecretariat brancheId={brancheId} eglise={branche?.nom} />
      )}

      {onglet === 'tresorerie' && (
        <LectureTresorerie brancheId={brancheId} mouvements={mouvements} solde={solde} seuil={seuil} eglise={branche?.nom} />
      )}

      {onglet === 'projets' && (
        <GestionProjets brancheId={brancheId} uid={profil.uid} lectureSeule={true} />
      )}

      {onglet === 'messages' && (
        <GestionMessages pasteurUid={profil.uid} pasteurNom={profil.nom} lectureSeule={false} />
      )}

      {onglet === 'utilisateurs' && (
        <DashboardUtilisateurs role="pasteur" brancheId={brancheId} />
      )}

      {onglet === 'apparence' && (
        <DashboardApparence brancheId={brancheId} branche={branche} />
      )}
    </div>
  )
}

function CaissePasteur({ brancheId, mouvements, solde, seuil, depasseSeuil, uid, eglise }) {
  const [type, setType] = useState('dime')
  const [montant, setMontant] = useState('')
  const [description, setDescription] = useState('')

  const [referenceVirement, setReferenceVirement] = useState('')
  const [montantVirement, setMontantVirement] = useState('')

  async function ajouterMouvement(e) {
    e.preventDefault()
    if (!montant) return
    await addDoc(collection(db, 'branches', brancheId, 'caisse'), {
      type,
      montant: Number(montant),
      description,
      date: serverTimestamp(),
      auteurUid: uid,
    })
    setMontant('')
    setDescription('')
  }

  async function declarerVirement(e) {
    e.preventDefault()
    if (!montantVirement) return
    await addDoc(collection(db, 'branches', brancheId, 'virements'), {
      montant: Number(montantVirement),
      reference: referenceVirement,
      statut: 'declare',
      dateDeclaration: serverTimestamp(),
      declareParUid: uid,
      valideParUid: null,
      dateValidation: null,
    })
    setMontantVirement('')
    setReferenceVirement('')
  }

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Solde actuel</h2>
        <p className="grand-nombre">{solde.toLocaleString('fr-FR')} FCFA</p>
        {seuil != null && (
          <p className={depasseSeuil ? 'alerte' : 'note'}>
            Seuil autorisé : {seuil.toLocaleString('fr-FR')} FCFA
            {depasseSeuil && ' — le seuil est dépassé, un virement vers le national est requis.'}
          </p>
        )}

        <h3 className="titre-section">Enregistrer un mouvement</h3>
        <form onSubmit={ajouterMouvement} className="formulaire">
          <select value={type} onChange={(e) => setType(e.target.value)} className="champ-saisie">
            {TYPES_MOUVEMENT.map((t) => (
              <option key={t.valeur} value={t.valeur}>{t.label}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Montant (FCFA)"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            className="champ-saisie"
            required
          />
          <input
            type="text"
            placeholder="Description (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="champ-saisie"
          />
          <button type="submit" className="bouton-principal">Enregistrer</button>
        </form>

        <>
          <h3 className="titre-section">Déclarer un virement au national</h3>
          {depasseSeuil && (
            <p className="alerte" style={{ marginBottom: '0.75rem' }}>
              Le seuil est dépassé — un virement est requis.
            </p>
          )}
          <form onSubmit={declarerVirement} className="formulaire">
            <input
              type="number"
              placeholder="Montant transféré (FCFA)"
              value={montantVirement}
              onChange={(e) => setMontantVirement(e.target.value)}
              className="champ-saisie"
              required
            />
            <input
              type="text"
              placeholder="Référence du virement"
              value={referenceVirement}
              onChange={(e) => setReferenceVirement(e.target.value)}
              className="champ-saisie"
            />
            <button type="submit" className="bouton-secondaire">Déclarer le virement</button>
          </form>
        </>
      </section>

      <section className="carte">
        <div className="barre-titre"><h2 className="titre-carte">Historique des mouvements</h2><BoutonPdf label="Journal de caisse en PDF" onExport={() => exporterJournalCaisse(mouvements, { eglise })} disabled={mouvements.length === 0} /></div>
        <ul className="liste">
          {mouvements.map((m) => (
            <li key={m.id} className="ligne-liste">
              <span>{TYPES_MOUVEMENT.find((t) => t.valeur === m.type)?.label ?? m.type}</span>
              <span>{m.description}</span>
              <span className={m.type === 'depense' ? 'montant-negatif' : 'montant-positif'}>
                {m.type === 'depense' ? '-' : '+'}{m.montant.toLocaleString('fr-FR')} FCFA
              </span>
            </li>
          ))}
          {mouvements.length === 0 && <p className="note">Aucun mouvement enregistré pour l'instant.</p>}
        </ul>
      </section>
    </div>
  )
}

function MembresPasteur({ brancheId, membres, uid, eglise }) {
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [statut, setStatut] = useState('nouveau')
  const [membreSelectionne, setMembreSelectionne] = useState(null)

  async function ajouterMembre(e) {
    e.preventDefault()
    if (!nom) return
    await addDoc(collection(db, 'branches', brancheId, 'membres'), {
      nom, prenom, statut, dateAdhesion: serverTimestamp(),
    })
    setNom('')
    setPrenom('')
    setStatut('nouveau')
  }

  const membreAffiche = membres.find((m) => m.id === membreSelectionne)

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Ajouter un membre</h2>
        <form onSubmit={ajouterMembre} className="formulaire">
          <input type="text" placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} className="champ-saisie" required />
          <input type="text" placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} className="champ-saisie" />
          <select value={statut} onChange={(e) => setStatut(e.target.value)} className="champ-saisie">
            <option value="nouveau">Nouveau</option>
            <option value="regulier">Régulier</option>
            <option value="membre_officiel">Membre officiel</option>
          </select>
          <button type="submit" className="bouton-principal">Ajouter</button>
        </form>

        <div className="barre-titre" style={{ marginTop: '2rem' }}><div className="barre-titre"><h2 className="titre-carte">Registre des membres ({membres.length})</h2><BoutonPdf onExport={() => exporterMembres(membres, { eglise })} disabled={membres.length === 0} /></div><BoutonPdf onExport={() => exporterMembres(membres, { eglise })} disabled={membres.length === 0} /></div>
        <ul className="liste">
          {membres.map((m) => (
            <li key={m.id} className="ligne-liste" style={{ cursor: 'pointer' }} onClick={() => setMembreSelectionne(m.id)}>
              <span>{m.prenom} {m.nom}</span>
              <span className="etiquette">{m.statut?.replace('_', ' ')}</span>
            </li>
          ))}
          {membres.length === 0 && <p className="note">Aucun membre enregistré pour l'instant.</p>}
        </ul>
      </section>

      <section className="carte">
        {membreAffiche ? (
          <SuiviMembre
            brancheId={brancheId}
            membre={membreAffiche}
            uid={uid}
            onFermer={() => setMembreSelectionne(null)}
          />
        ) : (
          <p className="note">Sélectionne un membre pour voir et mettre à jour son parcours spirituel.</p>
        )}
      </section>
    </div>
  )
}

// ── Vue lecture seule : travail du secrétaire de branche ─────────────────────
function LectureSecretariat({ brancheId, eglise }) {
  const [onglet, setOnglet] = useState('membres')
  const [membres, setMembres] = useState([])
  const [pvs, setPvs] = useState([])
  const [courriers, setCourriers] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'branches', brancheId, 'membres'), orderBy('nom'))
    return onSnapshot(q, (snap) => setMembres(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [brancheId])

  useEffect(() => {
    const q = query(collection(db, 'branches', brancheId, 'pv'), orderBy('date', 'desc'))
    return onSnapshot(q, (snap) => setPvs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [brancheId])

  useEffect(() => {
    const q = query(collection(db, 'branches', brancheId, 'courrier'), orderBy('date', 'desc'))
    return onSnapshot(q, (snap) => setCourriers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [brancheId])

  return (
    <div>
      <div style={{ background: '#EAF3FF', border: '1px solid var(--ligne)', borderRadius: '4px', padding: '0.6rem 1rem', marginBottom: '1rem' }}>
        <p className="note" style={{ margin: 0 }}>📋 Vue en lecture seule — travail du secrétaire de votre église locale.</p>
      </div>
      <nav className="onglets">
        <button className={onglet === 'membres' ? 'onglet actif' : 'onglet'} onClick={() => setOnglet('membres')}>Membres ({membres.length})</button>
        <button className={onglet === 'pv' ? 'onglet actif' : 'onglet'} onClick={() => setOnglet('pv')}>Procès-verbaux ({pvs.length})</button>
        <button className={onglet === 'courrier' ? 'onglet actif' : 'onglet'} onClick={() => setOnglet('courrier')}>Courrier ({courriers.length})</button>
      </nav>

      {onglet === 'membres' && (
        <section className="carte">
          <div className="barre-titre"><h2 className="titre-carte">Registre des membres ({membres.length})</h2><BoutonPdf onExport={() => exporterMembres(membres, { eglise })} disabled={membres.length === 0} /></div>
          <ul className="liste">
            {membres.map((m) => (
              <li key={m.id} className="ligne-liste">
                <span>{m.prenom} {m.nom}</span>
                <span>{m.telephone || '—'}</span>
                <span className="etiquette">{m.statut?.replace('_', ' ')}</span>
              </li>
            ))}
            {membres.length === 0 && <p className="note">Aucun membre enregistré par le secrétaire.</p>}
          </ul>
        </section>
      )}

      {onglet === 'pv' && (
        <section className="carte">
          <div className="barre-titre"><h2 className="titre-carte">Procès-verbaux ({pvs.length})</h2><BoutonPdf label="Exporter le registre" onExport={() => exporterPVs(pvs, { eglise })} disabled={pvs.length === 0} /></div>
          <ul className="liste">
            {pvs.map((p) => (
              <li key={p.id} className="ligne-liste-verticale">
                <strong>{p.date ? new Date(p.date + 'T00:00').toLocaleDateString('fr-FR') : '—'}</strong> — {p.objet}
                {p.contenu && <p className="note" style={{ marginTop: '0.25rem' }}>{p.contenu.slice(0, 200)}{p.contenu.length > 200 ? '…' : ''}</p>}
              </li>
            ))}
            {pvs.length === 0 && <p className="note">Aucun PV enregistré par le secrétaire.</p>}
          </ul>
        </section>
      )}

      {onglet === 'courrier' && (
        <section className="carte">
          <div className="barre-titre"><h2 className="titre-carte">Registre des courriers ({courriers.length})</h2><BoutonPdf onExport={() => exporterCourriers(courriers, { eglise })} disabled={courriers.length === 0} /></div>
          <ul className="liste">
            {courriers.map((c) => (
              <li key={c.id} className="ligne-liste">
                <span className="etiquette">{c.sens === 'entrant' ? '↓ Entrant' : '↑ Sortant'}</span>
                <span>{c.date ? new Date(c.date + 'T00:00').toLocaleDateString('fr-FR') : '—'}</span>
                <span>{c.expediteur}</span>
                <span>{c.objet}</span>
              </li>
            ))}
            {courriers.length === 0 && <p className="note">Aucun courrier enregistré par le secrétaire.</p>}
          </ul>
        </section>
      )}
    </div>
  )
}

// ── Vue lecture seule : travail du trésorier de branche ──────────────────────
function LectureTresorerie({ brancheId, mouvements, solde, seuil, eglise }) {
  const depasseSeuil = seuil != null && solde > seuil
  const TYPES = [
    { valeur: 'dime', label: 'Dîme' },
    { valeur: 'collecte', label: 'Collecte' },
    { valeur: 'don', label: 'Don' },
    { valeur: 'depense', label: 'Dépense' },
  ]

  return (
    <div>
      <div style={{ background: '#EAF3FF', border: '1px solid var(--ligne)', borderRadius: '4px', padding: '0.6rem 1rem', marginBottom: '1rem' }}>
        <p className="note" style={{ margin: 0 }}>💰 Vue en lecture seule — travail du trésorier de votre église locale.</p>
      </div>
      <div className="grille-deux">
        <section className="carte">
          <h2 className="titre-carte">Solde actuel</h2>
          <p className="grand-nombre">{solde.toLocaleString('fr-FR')} FCFA</p>
          {seuil != null && (
            <p className={depasseSeuil ? 'alerte' : 'note'}>
              Seuil autorisé : {seuil.toLocaleString('fr-FR')} FCFA
              {depasseSeuil && ' — seuil dépassé.'}
            </p>
          )}
          <h3 className="titre-section">Résumé par type</h3>
          <ul className="liste">
            {TYPES.map(({ valeur, label }) => {
              const total = mouvements.filter((m) => m.type === valeur).reduce((s, m) => s + m.montant, 0)
              return (
                <li key={valeur} className="ligne-liste">
                  <span>{label}</span>
                  <span className={valeur === 'depense' ? 'montant-negatif' : 'montant-positif'}>
                    {total.toLocaleString('fr-FR')} FCFA
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
        <section className="carte">
          <div className="barre-titre"><h2 className="titre-carte">Derniers mouvements</h2><BoutonPdf label="Journal complet en PDF" onExport={() => exporterJournalCaisse(mouvements, { eglise })} disabled={mouvements.length === 0} /></div>
          <ul className="liste">
            {mouvements.slice(0, 20).map((m) => (
              <li key={m.id} className="ligne-liste">
                <span>{TYPES.find((t) => t.valeur === m.type)?.label ?? m.type}</span>
                <span>{m.description}</span>
                <span className={m.type === 'depense' ? 'montant-negatif' : 'montant-positif'}>
                  {m.type === 'depense' ? '-' : '+'}{m.montant.toLocaleString('fr-FR')} FCFA
                </span>
              </li>
            ))}
            {mouvements.length === 0 && <p className="note">Aucun mouvement enregistré.</p>}
          </ul>
        </section>
      </div>
    </div>
  )
}


// ── Vue d'ensemble du pasteur : il supervise, il ne saisit pas ──────────────
function SupervisionPasteur({ mouvements, membres, solde, seuil, depasseSeuil }) {
  const debutMois = new Date(); debutMois.setDate(1); debutMois.setHours(0, 0, 0, 0)
  const duMois = mouvements.filter((m) => (m.date?.toDate ? m.date.toDate() : new Date(0)) >= debutMois)
  const entrees = duMois.filter((m) => m.type !== 'depense').reduce((a, m) => a + m.montant, 0)
  const sorties = duMois.filter((m) => m.type === 'depense').reduce((a, m) => a + m.montant, 0)
  const f = (n) => `${n.toLocaleString('fr-FR')} FCFA`
  const carte = (titre, valeur, note) => (
    <div className="carte" style={{ flex: '1 1 10rem' }}>
      <div className="note">{titre}</div>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: '1.5rem', margin: '0.2rem 0' }}>{valeur}</div>
      {note && <div className="note">{note}</div>}
    </div>
  )
  return (
    <div>
      <h2 className="titre-carte">Vue d'ensemble</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        {carte('Solde de la caisse', f(solde), seuil != null ? `Seuil autorisé : ${f(seuil)}` : null)}
        {carte('Membres enregistrés', membres.length)}
        {carte('Entrées du mois', f(entrees))}
        {carte('Dépenses du mois', f(sorties))}
      </div>
      {depasseSeuil && <p className="alerte" style={{ marginTop: '1rem' }}>Le solde dépasse le seuil autorisé : un virement vers le national est à prévoir.</p>}
      <p className="note" style={{ marginTop: '1rem' }}>
        Le détail est dans « Secrétariat » et « Trésorerie », en lecture seule. Pour demander quelque chose à un collaborateur, utilisez « Rappels à l'équipe ».
      </p>
    </div>
  )
}
