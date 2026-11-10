# 01 — Installation du poste de développement

Ce document permet de faire tourner l'application sur un poste de développement, en partant de zéro.

## 1. Prérequis

| Outil | Version | Remarque |
| --- | --- | --- |
| Node.js | 20 ou plus récent | Vérifier avec `node -v` |
| npm | fourni avec Node.js | Le dépôt utilise `package-lock.json` : ne pas utiliser yarn ou pnpm |
| Git | toute version récente | |
| Docker | optionnel | Uniquement pour une base Supabase locale (option B ci-dessous) |
| Android Studio | optionnel | Uniquement pour l'application Android, voir [06 — Déploiement](06-deploiement.md) |

## 2. Récupérer le code et installer les dépendances

```bash
git clone https://github.com/ske-media/HUB_Environnmement_APP.git
cd HUB_Environnmement_APP
npm ci
```

`npm ci` installe exactement les versions figées dans `package-lock.json`. Utiliser `npm install` seulement pour ajouter ou mettre à jour une dépendance.

## 3. Choisir la base de données de travail

L'application a besoin d'un projet Supabase. Deux possibilités.

### Option A — Un projet Supabase de test (recommandé)

Travailler sur un projet séparé évite toute erreur sur les données réelles.

1. Créer un projet sur https://supabase.com (l'offre gratuite suffit pour développer).
2. Appliquer le schéma de ce dépôt :

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-du-projet-de-test>
   npx supabase db push
   ```

   `db push` exécute dans l'ordre les fichiers de `supabase/migrations/`. Il crée les tables, les droits d'accès, les fonctions et l'espace de stockage des photos.
3. Dans le tableau de bord du projet, menu **Authentication > URL Configuration** :
   - **Site URL** : `http://localhost:5173`
   - **Redirect URLs** : ajouter `http://localhost:5173/login` et `http://localhost:5173/auth/update-password`

### Option B — Supabase en local avec Docker

```bash
npx supabase start
```

La commande démarre une pile Supabase complète sur le poste et applique les migrations. Elle affiche à la fin l'URL de l'API (`http://127.0.0.1:54321`) et la clé `anon` à reporter dans `.env.local`. Les emails envoyés par l'authentification (confirmation, mot de passe oublié) ne partent pas réellement : ils sont consultables sur http://127.0.0.1:54324.

Pour repartir d'une base vide : `npx supabase db reset`. Pour arrêter : `npx supabase stop`.

### Et la base de production ?

Il est techniquement possible de brancher le poste de développement sur le projet Supabase de production : il suffit d'en utiliser l'URL et la clé. **C'est à éviter** : toute fiche créée, modifiée ou supprimée pendant un essai le serait pour de vrai, et les utilisateurs de terrain la verraient. À réserver à une vérification ponctuelle, en lecture.

## 4. Variables d'environnement

```bash
cp .env.example .env.local
```

Puis renseigner les deux valeurs dans `.env.local` :

| Variable | Où la trouver |
| --- | --- |
| `VITE_SUPABASE_URL` | Tableau de bord Supabase, réglages du projet, rubrique API. Forme : `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Même rubrique, clé publique nommée `anon` ou `publishable` |

Points à connaître :

- Ces deux valeurs sont **publiques** : elles se retrouvent dans le JavaScript envoyé au navigateur. Ce n'est pas un défaut. La protection des données est faite par la base (voir [07 — Sécurité](07-securite.md)).
- La clé `service_role` de Supabase, elle, est un secret absolu. Elle ne doit jamais apparaître dans ce dépôt ni dans une variable préfixée par `VITE_`.
- `.env.local` n'est pas versionné (voir `.gitignore`). Seul `.env.example` l'est.
- Si l'une des deux variables manque, l'application s'arrête au démarrage avec le message « Variables d'environnement Supabase manquantes » (contrôle fait dans `src/lib/supabase.ts`).

## 5. Lancer l'application

```bash
npm run dev
```

Ouvrir http://localhost:5173. Le port est fixe : si le port 5173 est déjà pris, la commande échoue au lieu d'en choisir un autre. Le serveur écoute aussi sur le réseau local, ce qui permet d'ouvrir l'application depuis un téléphone branché sur le même Wi-Fi (`http://<adresse-ip-du-poste>:5173`).

## 6. Créer un premier compte

1. Sur l'écran de connexion, choisir « Créer un compte ».
2. Utiliser une adresse se terminant par `@hub-environnement.com` : le formulaire refuse les autres. Sur une base de test, l'adresse n'a pas besoin d'exister réellement si la confirmation par email est désactivée (cas de l'option B) ; sinon, confirmer le compte depuis le tableau de bord Supabase, menu **Authentication > Users**.
3. Se connecter.

### Donner le rôle d'administrateur

Le rôle `super_admin` ouvre l'onglet « Administration » des paramètres. Pour l'attribuer, exécuter le script `supabase/scripts/assign_super_admin.sql` dans l'éditeur SQL de Supabase après y avoir remplacé l'adresse email, puis se déconnecter et se reconnecter.

### Faire apparaître un utilisateur dans les listes « Prélèveur » et « Chef de projet »

Ces listes déroulantes ne proposent que les utilisateurs dont l'identifiant figure dans `src/lib/constants/allowedFieldUsers.ts`. Sur une base de test, **elles seront donc vides** tant que l'identifiant du compte de test n'y a pas été ajouté. L'identifiant (UUID) se lit dans le tableau de bord Supabase, menu **Authentication > Users**.

En production, c'est aussi la marche à suivre pour ajouter ou retirer un collaborateur de ces listes (voir [08 — Passation](08-passation.md)).

## 7. Vérifier que tout fonctionne

```bash
npm test             # doit se terminer par « OK »
npm run build        # doit produire le dossier dist/ sans erreur
npm run check:pdf    # audit des modèles PDF, informatif
```

Parcours manuel conseillé après installation :

1. Créer un site (nom du client, numéro d'affaire, commune).
2. Ouvrir le site, créer une fiche « Campagne PID », la remplir, l'enregistrer.
3. Depuis la liste des fiches du site, exporter la fiche en PDF et ouvrir le fichier.
4. Dans les outils de développement du navigateur, passer en mode hors-ligne, créer une seconde fiche : un message indique qu'elle est gardée localement. Repasser en ligne : elle est envoyée automatiquement.

## 8. Problèmes fréquents

| Symptôme | Cause et solution |
| --- | --- |
| Page blanche, erreur « Variables d'environnement Supabase manquantes » dans la console | `.env.local` absent ou incomplet. Relancer `npm run dev` après correction : Vite ne relit les variables qu'au démarrage. |
| L'application affiche une ancienne version malgré une modification du code | Le service worker de la PWA est actif même en développement. Dans les outils de développement : onglet Application > Service Workers > « Unregister », puis recharger. |
| Les listes « Prélèveur » ou « Chef de projet » sont vides | Voir la section 6 : identifiant absent de `allowedFieldUsers.ts`. |
| L'export PDF échoue avec « Impossible de charger le template PDF » | Le modèle correspondant manque dans `public/pdf-templates/` ou n'est pas un PDF valide. Voir [04 — Fiches et PDF](04-fiches-et-pdf.md). |
| Les photos ne s'affichent pas (erreur 400 ou 403) | L'espace de stockage `survey-photos` n'existe pas ou n'est pas public sur le projet Supabase utilisé : les migrations n'ont pas été appliquées. |
| Le lien de l'email de réinitialisation renvoie vers une mauvaise adresse | Les « Redirect URLs » du projet Supabase ne contiennent pas l'adresse utilisée (section 3). |
| `npm run dev` échoue avec « Port 5173 is already in use » | Une autre instance tourne déjà. La fermer, ou libérer le port. |
