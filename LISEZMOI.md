# Prototype standard — Application de gestion d'église

Version fonctionnelle : connexion par rôle, caisse locale (dîme/collecte/dépense + seuil +
déclaration de virement), validation des virements par le national, registre des membres
avec suivi spirituel (étapes du parcours + notes), gestion des cultes et programmes (avec
présence), comptes-rendus de département, communication interne (annonces de branche et
annonces nationales), gestion des départements/ministères, événements spéciaux (baptêmes,
mariages, dédicaces, funérailles), gestion administrative des branches (création, ville,
seuil de solde — côté national), rapports et statistiques (locaux et consolidés), création
de comptes depuis l'app (module Utilisateurs), personnalisation logo/couleurs par église
(module Apparence), et notifications internes (alertes calculées dans l'app).

## 1. Créer le projet Firebase (une seule fois)

1. Aller sur https://console.firebase.google.com → Ajouter un projet (ex. "eglise-demo").
2. Activer **Authentication** → méthode Email/Mot de passe.
3. Activer **Firestore Database** (mode production).
4. Dans Paramètres du projet → Vos applications → ajouter une application Web → copier
   la config (`apiKey`, `authDomain`, etc.).
5. Coller cette config dans `src/lib/firebase.js` à la place des `"REMPLACER_MOI"`.
6. Mettre l'identifiant du projet dans `.firebaserc` à la place de `"REMPLACER_MOI"`.

## 2. Créer les premiers comptes

Dans la console Firebase → Authentication → Ajouter un utilisateur (email + mot de passe),
pour chaque personne (national, pasteur(s), responsable(s) de département).

Pour chaque compte créé, il faut ensuite, **avec l'aide de Claude** :
- ajouter son rôle dans `firestore.rules` (fonctions `roleDeUid` / `brancheDeUid`)
- créer sa fiche dans la collection `utilisateurs/{uid}` de Firestore, avec ses champs
  (`role`, `brancheId`, `departementId` si besoin)
- créer les documents `branches/{brancheId}` correspondants

## 3. Mettre le code sur GitHub (une seule fois)

1. Créer un compte sur https://github.com (gratuit).
2. Créer un nouveau dépôt (repository), par exemple `eglise-app` — **public** de préférence
   (Actions illimité et gratuit à vie sur les dépôts publics ; le code n'a rien de secret).
3. Sur la page du dépôt, cliquer sur le bouton vert **Code** → onglet **Codespaces** →
   **Create codespace on main**. Ça ouvre un éditeur avec un terminal, dans le navigateur —
   ça marche depuis un téléphone.
4. Dans le Codespace, importer le contenu de ce zip (glisser-déposer le fichier zip dans
   l'explorateur de fichiers à gauche, ou utiliser le bouton d'import), puis dans le terminal :
   ```
   unzip eglise-app-prototype-v1.zip -d .
   mv eglise-app/* eglise-app/.[!.]* . 2>/dev/null
   rmdir eglise-app
   git add .
   git commit -m "Première version du prototype"
   git push
   ```

## 4. Connecter GitHub à Firebase (une seule fois)

1. Aller sur https://console.cloud.google.com/iam-admin/serviceaccounts (le même projet
   que celui créé dans Firebase).
2. Créer un compte de service → rôle **Firebase Hosting Admin** → onglet **Clés** →
   **Ajouter une clé** → **JSON** → ça télécharge un fichier.
3. Ouvrir ce fichier JSON, copier tout son contenu.
4. Sur GitHub, aller dans le dépôt → **Settings** → **Secrets and variables** → **Actions**
   → **New repository secret** :
   - Nom `FIREBASE_SERVICE_ACCOUNT`, valeur = le contenu du fichier JSON copié
   - Nom `FIREBASE_PROJECT_ID`, valeur = l'identifiant du projet Firebase (ex. `eglise-demo`)
5. C'est fait. Le fichier `.github/workflows/deploy.yml` (déjà inclus dans ce zip) prendra
   le relais automatiquement.

## 5. Déployer une mise à jour (à chaque nouvelle version)

1. Rouvrir le Codespace du dépôt (ou en créer un nouveau).
2. Remplacer les fichiers modifiés par les nouveaux que Claude te donne.
3. Dans le terminal :
   ```
   git add .
   git commit -m "Mise à jour"
   git push
   ```
4. GitHub Actions construit et déploie automatiquement — visible dans l'onglet **Actions**
   du dépôt (icône ✅ quand c'est terminé, en général 1 à 2 minutes).

**Seule chose qui reste manuelle** : quand un rôle/compte est ajouté dans `firestore.rules`,
il faut coller le nouveau contenu du fichier dans la console Firebase → Firestore Database
→ Règles → Publier. Ce n'est pas automatisable sans un accès plus poussé, mais c'est rare.

## Limites connues de cette première version

- Pas encore de communication interne au niveau des membres eux-mêmes (les membres n'ont pas de compte ; la communication reste entre national/pasteurs/départements).
- **Création de comptes** : possible depuis l'app (onglet Utilisateurs), mais le nouveau compte n'a accès à rien tant que Claude n'a pas ajouté son uid dans `firestore.rules` et redéployé (voir `MODELE-DONNEES.md`).
- **Notifications** : ce sont des alertes affichées *dans l'app* (cloche en haut à droite), pas de vraies notifications push sur téléphone quand l'app est fermée — ça demanderait Firebase Cloud Messaging + un serveur déclencheur (Cloud Functions), qui nécessite un plan payant (Blaze) même s'il reste dans le quota gratuit.
- **Personnalisation** : logo (via une URL d'image déjà hébergée ailleurs) et couleurs, éditable par le pasteur dans l'onglet Apparence. Pas encore de import direct de fichier logo depuis le téléphone.
- Les rapports du national (membres, virements) utilisent des requêtes "collectionGroup" — Firestore peut demander la création d'un index au premier lancement (lien direct fourni dans la console du navigateur, un clic suffit).
- Pas de gestion des logos/couleurs personnalisés par église (prévu à l'étape d'adaptation).
- Le seuil de solde (`seuilSolde`) se règle manuellement dans le document `branches/{id}`
  sur Firestore, pas encore via une interface.
- La liste des virements en attente (vue nationale) peut demander la création d'un index
  Firestore au premier lancement — Firebase affichera un lien direct dans la console du
  navigateur pour le créer en un clic.
