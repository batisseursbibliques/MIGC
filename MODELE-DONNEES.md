# Modèle de données Firestore

Chaque église déployée = **un projet Firebase séparé** (comme pour ABBA). Pas de multi-tenant
partagé : une église = une instance complète de l'application.

## Collections

```
utilisateurs/{uid}
  - nom: string
  - role: "national" | "pasteur" | "departement"

branches/{brancheId}
  - nom: string
  - ville: string
  - pasteurUid: string       // lien réel du compte, mis à jour manuellement par Claude
  - pasteurNom: string       // nom affiché, modifiable par le national dans l'app
  - seuilSolde: number   // solde max avant virement obligatoire vers le national
  - logoUrl: string | null       // personnalisation (module Apparence)
  - couleurPrimaire, couleurAccent: string (hex) | null   // personnalisation (module Apparence)

  branches/{brancheId}/membres/{membreId}
    - nom, prenom: string
    - statut: "nouveau" | "regulier" | "membre_officiel" | "parti"
    - dateAdhesion: timestamp
    - convertiLe, baptiseLe, formationTermineeLe, ministereActifLe: string (date) | null — étapes du parcours

    branches/{brancheId}/membres/{membreId}/suivi/{suiviId}
      - contenu: string
      - date: timestamp
      - auteurUid: string

  branches/{brancheId}/departements/{deptId}
    - nom: string
    - objectifs: string
    - statut: "actif" | "inactif"
    - responsableUid: string | null   // lié manuellement (voir note plus bas)
    - responsableNom: string

    branches/{brancheId}/departements/{deptId}/comptesRendus/{crId}
      - date: timestamp
      - contenu: string
      - auteurUid: string

  branches/{brancheId}/annonces/{annonceId}
    - titre, contenu: string
    - date: timestamp
    - auteurUid: string

  branches/{brancheId}/evenements/{evenementId}
    - type: "bapteme" | "mariage" | "dedicace" | "funerailles"
    - date: string (AAAA-MM-JJ)
    - personnesConcernees: string
    - notes: string

annoncesNationales/{annonceId}   // collection racine, diffusée à tout le mouvement
  - titre, contenu: string
  - date: timestamp
  - auteurUid: string

  branches/{brancheId}/cultes/{culteId}
    - type: "dominical" | "semaine" | "special"
    - date: string (AAAA-MM-JJ)
    - heure: string
    - theme, predicateur: string
    - programme: tableau de { titre, responsable }
    - presence: { hommes, femmes, enfants, total } | null

  branches/{brancheId}/caisse/{mouvementId}
    - type: "dime" | "collecte" | "don" | "depense"
    - montant: number
    - date: timestamp
    - description: string
    - auteurUid: string

  branches/{brancheId}/virements/{virementId}
    - montant: number
    - dateDeclaration: timestamp
    - reference: string
    - statut: "declare" | "valide" | "rejete"
    - declareParUid: string
    - valideParUid: string | null
    - dateValidation: timestamp | null
```

## ⚠️ Règle héritée du projet ABBA (bug résolu, ne pas répéter l'erreur)

Les fonctions `get()` / `exists()` dans `firestore.rules` se sont montrées **peu fiables** sur
le projet ABBA. Par précaution, ce projet suit la même règle : **le rôle et la branche de
chaque utilisateur sont codés en dur** dans `firestore.rules` (fonctions `roleDeUid()` et
`brancheDeUid()`), pas lus dynamiquement dans Firestore.

**Conséquence pratique : chaque nouveau compte créé doit être ajouté à `firestore.rules`
par Claude, puis redéployé (push GitHub → déploiement automatique), avant de fonctionner.**

## Création de comptes depuis l'application (module Utilisateurs)

Le module Utilisateurs (onglet "Utilisateurs" pour le pasteur et le national) permet de
créer un compte (e-mail + mot de passe) et sa fiche Firestore **directement depuis l'app**,
sans passer par la console Firebase. Techniquement, ça fonctionne grâce à une "app Firebase
secondaire" temporaire, ce qui évite de déconnecter l'administrateur pendant la création.

**Ce que ça ne remplace pas** : à cause de la règle ci-dessus (pas de `get()`/`exists()`),
le compte créé n'aura accès à rien tant que Claude n'a pas ajouté son uid dans
`firestore.rules` et que ce n'est pas redéployé. Le module affiche l'uid à copier-coller
pour Claude juste après la création.
