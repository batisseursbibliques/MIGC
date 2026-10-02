import React, { useEffect, useState } from 'react'
import {
  collection, addDoc, onSnapshot, orderBy, query, doc, getDoc,
  serverTimestamp, updateDoc, increment,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal — reçoit brancheId (branche locale) ou null (national)
// lectureSeule = true pour le pasteur et le national qui consultent
// ─────────────────────────────────────────────────────────────────────────────
export default function GestionProjets({ brancheId, uid, lectureSeule = false }) {
  const [projets, setProjets] = useState([])
  const [projetActif, setProjetActif] = useState(null)
  const [vue, setVue] = useState('liste') // 'liste' | 'detail' | 'creer'

  const chemin = brancheId
    ? collection(db, 'branches', brancheId, 'projets')
    : collection(db, 'projetsNationaux')

  useEffect(() => {
    const q = query(chemin, orderBy('creeLe', 'desc'))
    return onSnapshot(q, (snap) => {
      setProjets(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [brancheId])

  function ouvrirProjet(p) {
    setProjetActif(p)
    setVue('detail')
  }

  if (vue === 'detail' && projetActif) {
    return (
      <DetailProjet
        projet={projetActif}
        brancheId={brancheId}
        uid={uid}
        lectureSeule={lectureSeule}
        onRetour={() => { setVue('liste'); setProjetActif(null) }}
      />
    )
  }

  if (vue === 'creer' && !lectureSeule) {
    return (
      <FormulaireCreerProjet
        brancheId={brancheId}
        uid={uid}
        onRetour={() => setVue('liste')}
      />
    )
  }

  // ── Liste des projets ────────────────────────────────────────────────────
  const totalRecu = (p) => (p.totalRecu ?? 0)
  const progression = (p) => p.objectif > 0 ? Math.min(100, Math.round((totalRecu(p) / p.objectif) * 100)) : 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 className="titre-carte" style={{ margin: 0 }}>
          {brancheId ? "Projets de l'église locale" : 'Projets du BEN'}
        </h2>
        {!lectureSeule && (
          <button className="bouton-principal" onClick={() => setVue('creer')}>
            + Nouveau projet
          </button>
        )}
      </div>

      {projets.length === 0 && (
        <p className="note">Aucun projet enregistré pour le moment.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {projets.map((p) => {
          const pct = progression(p)
          const atteint = pct >= 100
          return (
            <div
              key={p.id}
              className="carte"
              style={{ cursor: 'pointer' }}
              onClick={() => ouvrirProjet(p)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', color: 'var(--encre)' }}>{p.nom}</h3>
                  <p className="note" style={{ margin: 0 }}>{p.description?.slice(0, 100)}{p.description?.length > 100 ? '…' : ''}</p>
                </div>
                <span className="etiquette" style={{ background: atteint ? '#d4edda' : undefined, flexShrink: 0, marginLeft: '1rem' }}>
                  {atteint ? '✅ Objectif atteint' : 'En cours'}
                </span>
              </div>

              {p.objectif > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--texte-doux)', marginBottom: '0.3rem' }}>
                    <span>{totalRecu(p).toLocaleString('fr-FR')} FCFA reçus</span>
                    <span>Objectif : {p.objectif.toLocaleString('fr-FR')} FCFA ({pct}%)</span>
                  </div>
                  <div style={{ background: 'var(--ligne)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, background: atteint ? 'var(--sauge)' : 'var(--ocre)', height: '100%', transition: 'width 0.4s' }} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Formulaire de création d'un projet
// ─────────────────────────────────────────────────────────────────────────────
function FormulaireCreerProjet({ brancheId, uid, onRetour }) {
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [objectif, setObjectif] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [enCours, setEnCours] = useState(false)

  async function creer(e) {
    e.preventDefault()
    setEnCours(true)
    const chemin = brancheId
      ? collection(db, 'branches', brancheId, 'projets')
      : collection(db, 'projetsNationaux')
    await addDoc(chemin, {
      nom, description,
      objectif: objectif ? Number(objectif) : 0,
      dateDebut: dateDebut || null,
      dateFin: dateFin || null,
      totalRecu: 0,
      totalPromis: 0,
      creeLe: serverTimestamp(),
      creeParUid: uid,
    })
    setEnCours(false)
    onRetour()
  }

  return (
    <div>
      <button className="bouton-lien" onClick={onRetour} style={{ marginBottom: '1rem' }}>← Retour aux projets</button>
      <section className="carte" style={{ maxWidth: '520px' }}>
        <h2 className="titre-carte">Créer un nouveau projet</h2>
        <form onSubmit={creer} className="formulaire">
          <label className="champ-label">Nom du projet *</label>
          <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} className="champ-saisie" required />

          <label className="champ-label">Description / Détails</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="champ-saisie champ-texte" rows={4} placeholder="Objectif du projet, contexte, besoins…" />

          <label className="champ-label">Objectif financier (FCFA)</label>
          <input type="number" value={objectif} onChange={(e) => setObjectif(e.target.value)} className="champ-saisie" placeholder="0 si pas d'objectif défini" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="champ-label">Date de début</label>
              <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="champ-saisie" />
            </div>
            <div>
              <label className="champ-label">Date de fin prévue</label>
              <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="champ-saisie" />
            </div>
          </div>

          <button type="submit" className="bouton-principal" disabled={enCours}>
            {enCours ? 'Enregistrement…' : 'Créer le projet'}
          </button>
        </form>
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Détail d'un projet — 4 onglets
// ─────────────────────────────────────────────────────────────────────────────
function DetailProjet({ projet, brancheId, uid, lectureSeule, onRetour }) {
  const [onglet, setOnglet] = useState('ponctuelles')
  const [contributions, setContributions] = useState([])
  const [membres, setMembres] = useState([])
  const [showFormulaire, setShowFormulaire] = useState(false)

  const cheminProjet = brancheId
    ? doc(db, 'branches', brancheId, 'projets', projet.id)
    : doc(db, 'projetsNationaux', projet.id)
  const cheminContribs = collection(cheminProjet, 'contributions')

  // Chargement des contributions
  useEffect(() => {
    const q = query(cheminContribs, orderBy('creeLe', 'desc'))
    return onSnapshot(q, (snap) => setContributions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [projet.id])

  // Chargement des membres (pour la liste déroulante)
  useEffect(() => {
    if (!brancheId) return
    const q = query(collection(db, 'branches', brancheId, 'membres'), orderBy('nom'))
    return onSnapshot(q, (snap) => setMembres(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [brancheId])

  // Calculs
  const ponctuelles = contributions.filter((c) => !c.promesse && !c.externe)
  const promesses = contributions.filter((c) => c.promesse > 0 && !c.externe)
  const exterieures = contributions.filter((c) => c.externe)
  const nonContributeurs = membres.filter((m) => !contributions.some((c) => c.membreId === m.id))

  const totalRecu = contributions.filter((c) => !c.externe).reduce((s, c) => s + (c.totalVerse ?? c.montant ?? 0), 0)
  const totalPromis = promesses.reduce((s, c) => s + (c.promesse ?? 0), 0)
  const totalExterieur = exterieures.reduce((s, c) => s + (c.montant ?? 0), 0)
  const objectif = projet.objectif ?? 0
  const pct = objectif > 0 ? Math.min(100, Math.round((totalRecu / objectif) * 100)) : 0
  const atteint = pct >= 100

  return (
    <div>
      <button className="bouton-lien" onClick={onRetour} style={{ marginBottom: '1rem' }}>← Retour aux projets</button>

      {/* En-tête du projet */}
      <section className="carte" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 className="titre-carte" style={{ marginBottom: '0.25rem' }}>{projet.nom}</h2>
            {projet.description && <p className="note">{projet.description}</p>}
            {(projet.dateDebut || projet.dateFin) && (
              <p className="note" style={{ marginTop: '0.25rem' }}>
                {projet.dateDebut && <>Du {new Date(projet.dateDebut + 'T00:00').toLocaleDateString('fr-FR')}</>}
                {projet.dateFin && <> au {new Date(projet.dateFin + 'T00:00').toLocaleDateString('fr-FR')}</>}
              </p>
            )}
          </div>
          <span className="etiquette" style={{ background: atteint ? '#d4edda' : undefined }}>
            {atteint ? '✅ Objectif atteint' : 'En cours'}
          </span>
        </div>

        {/* Résumé financier */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p className="note" style={{ margin: '0 0 0.2rem' }}>Total reçu</p>
            <p className="montant-positif" style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{totalRecu.toLocaleString('fr-FR')} FCFA</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p className="note" style={{ margin: '0 0 0.2rem' }}>Total promis</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--ocre)' }}>{totalPromis.toLocaleString('fr-FR')} FCFA</p>
          </div>
          {totalExterieur > 0 && (
            <div style={{ textAlign: 'center' }}>
              <p className="note" style={{ margin: '0 0 0.2rem' }}>Contributions ext.</p>
              <p style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--encre-claire)' }}>{totalExterieur.toLocaleString('fr-FR')} FCFA</p>
            </div>
          )}
          {objectif > 0 && (
            <div style={{ textAlign: 'center' }}>
              <p className="note" style={{ margin: '0 0 0.2rem' }}>Objectif</p>
              <p style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{objectif.toLocaleString('fr-FR')} FCFA</p>
            </div>
          )}
        </div>

        {objectif > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--texte-doux)', marginBottom: '0.3rem' }}>
              <span>Progression</span><span>{pct}%</span>
            </div>
            <div style={{ background: 'var(--ligne)', borderRadius: '4px', height: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, background: atteint ? 'var(--sauge)' : 'var(--ocre)', height: '100%', transition: 'width 0.4s' }} />
            </div>
          </div>
        )}

        {!lectureSeule && (
          <div style={{ marginTop: '1rem' }}>
            <button className="bouton-principal" onClick={() => setShowFormulaire(true)}>
              + Ajouter un contributeur
            </button>
          </div>
        )}
      </section>

      {/* Formulaire ajout contributeur */}
      {showFormulaire && !lectureSeule && (
        <FormulaireContributeur
          membres={membres}
          cheminContribs={cheminContribs}
          cheminProjet={cheminProjet}
          uid={uid}
          onFermer={() => setShowFormulaire(false)}
        />
      )}

      {/* Onglets */}
      <nav className="onglets">
        <button className={onglet === 'ponctuelles' ? 'onglet actif' : 'onglet'} onClick={() => setOnglet('ponctuelles')}>
          Contributions ponctuelles ({ponctuelles.length})
        </button>
        <button className={onglet === 'promesses' ? 'onglet actif' : 'onglet'} onClick={() => setOnglet('promesses')}>
          Promesses en cours ({promesses.length})
        </button>
        <button className={onglet === 'exterieures' ? 'onglet actif' : 'onglet'} onClick={() => setOnglet('exterieures')}>
          Contributions extérieures ({exterieures.length})
        </button>
        <button className={onglet === 'nonContributeurs' ? 'onglet actif' : 'onglet'} onClick={() => setOnglet('nonContributeurs')}>
          Pas encore contribué ({nonContributeurs.length})
        </button>
      </nav>

      {/* Contenu des onglets */}
      {onglet === 'ponctuelles' && (
        <section className="carte">
          <h2 className="titre-carte">Contributions ponctuelles</h2>
          <ul className="liste">
            {ponctuelles.map((c) => (
              <li key={c.id} className="ligne-liste">
                <span>{c.nomMembre}</span>
                <span className="montant-positif">{(c.montant ?? 0).toLocaleString('fr-FR')} FCFA</span>
              </li>
            ))}
            {ponctuelles.length === 0 && <p className="note">Aucune contribution ponctuelle.</p>}
          </ul>
        </section>
      )}

      {onglet === 'promesses' && (
        <section className="carte">
          <h2 className="titre-carte">Promesses en cours de complétude</h2>
          <ul className="liste">
            {promesses.map((c) => {
              const verse = c.totalVerse ?? 0
              const p = c.promesse ?? 0
              const pctP = p > 0 ? Math.min(100, Math.round((verse / p) * 100)) : 0
              const complete = pctP >= 100
              return (
                <li key={c.id} className="ligne-liste-verticale">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{c.nomMembre}</strong>
                    <span className="etiquette" style={{ background: complete ? '#d4edda' : undefined }}>
                      {complete ? '✅ Complet' : `${verse.toLocaleString('fr-FR')} / ${p.toLocaleString('fr-FR')} FCFA`}
                    </span>
                  </div>
                  <div style={{ background: 'var(--ligne)', borderRadius: '4px', height: '6px', margin: '0.4rem 0', overflow: 'hidden' }}>
                    <div style={{ width: `${pctP}%`, background: complete ? 'var(--sauge)' : 'var(--ocre)', height: '100%' }} />
                  </div>
                  {!lectureSeule && !complete && (
                    <NouveauVersement contribution={c} cheminContribs={cheminContribs} cheminProjet={cheminProjet} />
                  )}
                </li>
              )
            })}
            {promesses.length === 0 && <p className="note">Aucune promesse enregistrée.</p>}
          </ul>
        </section>
      )}

      {onglet === 'exterieures' && (
        <section className="carte">
          <h2 className="titre-carte">Contributions extérieures (non-membres)</h2>
          <ul className="liste">
            {exterieures.map((c) => (
              <li key={c.id} className="ligne-liste">
                <span>{c.nomMembre}</span>
                <span className="montant-positif">{(c.montant ?? 0).toLocaleString('fr-FR')} FCFA</span>
              </li>
            ))}
            {exterieures.length === 0 && <p className="note">Aucune contribution de personnes extérieures.</p>}
          </ul>
        </section>
      )}

      {onglet === 'nonContributeurs' && (
        <section className="carte">
          <h2 className="titre-carte">Membres n'ayant pas encore contribué</h2>
          <ul className="liste">
            {nonContributeurs.map((m) => (
              <li key={m.id} className="ligne-liste">
                <span>{m.prenom} {m.nom}</span>
                <span className="etiquette">{m.statut?.replace('_', ' ')}</span>
              </li>
            ))}
            {nonContributeurs.length === 0 && <p className="note">Tous les membres ont contribué 🎉</p>}
          </ul>
        </section>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Formulaire d'ajout d'un contributeur
// ─────────────────────────────────────────────────────────────────────────────
function FormulaireContributeur({ membres, cheminContribs, cheminProjet, uid, onFermer }) {
  const [membreId, setMembreId] = useState('')
  const [nomExterne, setNomExterne] = useState('')
  const [promesse, setPromesse] = useState('')
  const [montant, setMontant] = useState('')
  const [enCours, setEnCours] = useState(false)

  const estExterne = membreId === 'AUTRE'
  const membre = membres.find((m) => m.id === membreId)
  const nomMembre = estExterne ? nomExterne : (membre ? `${membre.prenom ?? ''} ${membre.nom}`.trim() : '')

  async function enregistrer(e) {
    e.preventDefault()
    if (!nomMembre) return
    setEnCours(true)

    const montantNum = montant ? Number(montant) : 0
    const promesseNum = promesse ? Number(promesse) : 0
    const externe = estExterne

    await addDoc(cheminContribs, {
      membreId: externe ? null : membreId,
      nomMembre,
      externe,
      promesse: externe ? 0 : promesseNum,
      montant: externe ? montantNum : (promesseNum === 0 ? montantNum : 0),
      totalVerse: externe ? 0 : montantNum,
      creeLe: serverTimestamp(),
      saisieParUid: uid,
    })

    // Mise à jour des totaux du projet
    await updateDoc(cheminProjet, {
      totalRecu: increment(montantNum),
      totalPromis: increment(externe ? 0 : promesseNum),
    })

    setEnCours(false)
    onFermer()
  }

  return (
    <section className="carte" style={{ marginBottom: '1.5rem', borderColor: 'var(--ocre)' }}>
      <h2 className="titre-carte">Ajouter un contributeur</h2>
      <form onSubmit={enregistrer} className="formulaire" style={{ maxWidth: '460px' }}>
        <label className="champ-label">Membre *</label>
        <select value={membreId} onChange={(e) => setMembreId(e.target.value)} className="champ-saisie" required>
          <option value="">— Choisir —</option>
          <option value="AUTRE">Autre (personne extérieure)</option>
          {membres.map((m) => (
            <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>
          ))}
        </select>

        {estExterne && (
          <>
            <label className="champ-label">Nom de la personne extérieure *</label>
            <input type="text" value={nomExterne} onChange={(e) => setNomExterne(e.target.value)} className="champ-saisie" required />
          </>
        )}

        {!estExterne && membreId && (
          <>
            <label className="champ-label">Montant de la promesse (FCFA) — laisser vide si pas de promesse</label>
            <input type="number" value={promesse} onChange={(e) => setPromesse(e.target.value)} className="champ-saisie" placeholder="0" />
          </>
        )}

        <label className="champ-label">
          {estExterne ? 'Montant donné (FCFA) *' : 'Premier versement (FCFA) — laisser vide si rien encore'}
        </label>
        <input
          type="number" value={montant} onChange={(e) => setMontant(e.target.value)}
          className="champ-saisie" placeholder="0"
          required={estExterne}
        />

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="submit" className="bouton-principal" disabled={enCours}>
            {enCours ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button type="button" className="bouton-lien" onClick={onFermer}>Annuler</button>
        </div>
      </form>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Ajout d'un versement sur une promesse existante
// ─────────────────────────────────────────────────────────────────────────────
function NouveauVersement({ contribution, cheminContribs, cheminProjet }) {
  const [ouvert, setOuvert] = useState(false)
  const [montant, setMontant] = useState('')
  const [enCours, setEnCours] = useState(false)

  const restant = (contribution.promesse ?? 0) - (contribution.totalVerse ?? 0)

  async function enregistrer(e) {
    e.preventDefault()
    if (!montant) return
    setEnCours(true)
    const montantNum = Number(montant)
    // Mise à jour du total versé sur cette contribution
    await updateDoc(doc(cheminContribs, contribution.id), {
      totalVerse: increment(montantNum),
    })
    // Mise à jour du total du projet
    await updateDoc(cheminProjet, {
      totalRecu: increment(montantNum),
    })
    setMontant('')
    setEnCours(false)
    setOuvert(false)
  }

  return (
    <div style={{ marginTop: '0.4rem' }}>
      {!ouvert ? (
        <button className="bouton-lien" onClick={() => setOuvert(true)} style={{ fontSize: '0.85rem' }}>
          + Nouveau versement (reste {restant.toLocaleString('fr-FR')} FCFA)
        </button>
      ) : (
        <form onSubmit={enregistrer} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="number" value={montant} onChange={(e) => setMontant(e.target.value)}
            className="champ-saisie" placeholder="Montant (FCFA)"
            style={{ margin: 0, maxWidth: '180px' }} required
          />
          <button type="submit" className="bouton-secondaire" disabled={enCours}>
            {enCours ? '…' : 'Enregistrer'}
          </button>
          <button type="button" className="bouton-lien" onClick={() => setOuvert(false)}>Annuler</button>
        </form>
      )}
    </div>
  )
}
