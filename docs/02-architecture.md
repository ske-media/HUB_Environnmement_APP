# 02 — Architecture

## Vue d'ensemble

```
   Téléphone / ordinateur                         Supabase
┌───────────────────────────┐            ┌──────────────────────────┐
│  Application React (PWA)  │            │  Auth      comptes       │
│  ou enveloppe Android     │◄──HTTPS───►│  Postgres  sites, fiches │
│                           │            │  Storage   photos        │
│  Stockage local :         │            └──────────────────────────┘
│   - cache des requêtes    │
│   - brouillons            │            Services publics sans clé :
│   - file d'attente        │──HTTPS───► adresses (BAN), météo (Open-Meteo),
│   - photos en attente     │            fonds de carte (OSM, CARTO)
└───────────────────────────┘
        ▲
        │ fichiers statiques
   Netlify (hébergement)
```

L'application est un site statique. Il n'existe pas de serveur applicatif : le code qui s'exécute dans le navigateur appelle directement Supabase avec la clé publique, et c'est la base de données qui décide de ce que chaque utilisateur connecté peut lire ou écrire. Les modèles PDF sont livrés avec le site et remplis dans le navigateur ; aucun PDF n'est généré côté serveur.

## Organisation de `src/`

| Dossier | Rôle |
| --- | --- |
| `main.tsx`, `App.tsx` | Point d'entrée, fournisseurs globaux, table des routes |
| `pages/` | Un fichier par écran : `Dashboard`, `Sites`, `NewSite` (création et modification), `SiteSurveys` (fiches d'un site), `NewSurvey` (choix du type), `Settings`, écrans de connexion |
| `pages/surveys/` | Un formulaire par type de fiche (16 fichiers) |
| `schema/` | Un schéma Zod par type de fiche et un pour le site. Le schéma définit à la fois la validation et le type TypeScript des données |
| `components/` | Composants partagés : mise en page, cartes de site, filtres, boîtes de dialogue |
| `components/forms/` | Briques des formulaires : sections, champs, photos, bouton d'enregistrement |
| `components/dashboard/` | Blocs du tableau de bord : statistiques, activité récente, carte, météo |
| `components/ui/` | Composants de base : bouton, carte, fenêtre modale, tableau |
| `contexts/` | État global : `AuthContext` (session), `ThemeContext` (clair/sombre), `ToastContext` (notifications), `DialogContext` (confirmations) |
| `hooks/` | Logique réutilisable, détaillée plus bas |
| `lib/supabase.ts` | Client Supabase unique, gestion de « Se souvenir de moi » |
| `lib/offline/` | File d'attente hors-ligne des sites et des fiches |
| `lib/photos/` | Compression et envoi des photos |
| `lib/pdf-generators/` | Remplissage des modèles PDF et export |
| `lib/surveyTypes.ts` | Liste des types de fiches, libellés, icônes, types activés |
| `types.ts` | Types des lignes de la base (`Site`, `Survey`) |

L'alias `@/` pointe sur `src/` (défini dans `vite.config.ts` et `tsconfig.app.json`).

## Routes

Définies dans `src/App.tsx`.

| Chemin | Écran | Accès |
| --- | --- | --- |
| `/login`, `/signup`, `/forgot-password` | Connexion, inscription, mot de passe oublié | Public |
| `/reset-password`, `/auth/update-password` | Choix d'un nouveau mot de passe (lien reçu par email) | Public |
| `/` | Tableau de bord | Connecté |
| `/sites` | Liste des sites | Connecté |
| `/sites/new`, `/sites/:siteId/edit` | Création et modification d'un site | Connecté |
| `/sites/:siteId` | Fiches du site, export PDF | Connecté |
| `/sites/:siteId/surveys/new` | Choix du type de fiche | Connecté |
| `/sites/:siteId/surveys/<type>/new` | Création d'une fiche | Connecté |
| `/sites/:siteId/surveys/<type>/:surveyId` | Modification d'une fiche | Connecté |
| `/settings` | Compte, sécurité, corbeille, administration | Connecté |

Les routes protégées sont enveloppées par `ProtectedRoute`, qui renvoie vers `/login` en l'absence de session. Ce contrôle est un confort d'interface : la protection réelle est faite par la base.

## Parcours d'une fiche

1. **Ouverture du formulaire.** Le formulaire (`pages/surveys/…Form.tsx`) est piloté par React Hook Form avec le schéma Zod correspondant. À la création, les champs communs (numéro d'affaire, commune, chef de projet…) sont préremplis depuis le site par `useSiteDataForSurvey`. À la modification, les données sont lues dans `surveys.specific_data`, sauf si une version plus récente de la fiche attend encore dans la file d'attente locale : c'est alors elle qui est chargée (`lib/offline/loadSurveySpecificData.ts`).
2. **Saisie.** La navigation est bloquée par une demande de confirmation tant que des changements ne sont pas enregistrés (`useNavigationBlocker`). Sur la fiche « Sondage sol » uniquement, un brouillon est en plus écrit dans le stockage local du navigateur deux secondes après chaque modification (`useFormDraft`) ; si l'utilisateur quitte puis revient, une bannière propose de le reprendre.
3. **Photos.** Chaque photo est compressée sur l'appareil puis envoyée dans le stockage Supabase. Le formulaire ne conserve que l'adresse publique de l'image.
4. **Enregistrement.** L'identifiant de la fiche est généré sur l'appareil dès l'ouverture du formulaire (`useSurveyDraftId`). La fiche est d'abord écrite dans la file d'attente locale, puis envoyée par un `upsert` sur cet identifiant. Un double envoi ne crée donc pas de doublon.
5. **Sans réseau.** L'envoi échoue ou n'est pas tenté : la fiche reste dans la file d'attente. `OfflineSyncManager`, monté une seule fois dans `Layout`, la renvoie au prochain chargement de l'application ou au retour du réseau.
6. **Export.** Depuis la liste des fiches d'un site, le PDF est produit dans le navigateur à partir du modèle et de `specific_data`.

Le détail des étapes 3 à 5 est dans [05 — Hors-ligne et photos](05-hors-ligne-et-photos.md), celui de l'étape 6 dans [04 — Fiches et PDF](04-fiches-et-pdf.md).

## Hooks principaux

| Hook | Rôle |
| --- | --- |
| `useSites` | Lecture des sites actifs et archivés, archivage, restauration, mise à la corbeille |
| `useDashboardData` | Chiffres et activité du tableau de bord (un seul appel à la fonction SQL `get_dashboard_summary`) |
| `useUsers` | Liste des utilisateurs pour les menus « Prélèveur » et « Chef de projet » |
| `usePermission` | Droits de l'utilisateur dans l'interface |
| `useSiteDataForSurvey` | Données du site à reporter dans une nouvelle fiche |
| `useSurveyDraftId` | Identifiant stable de la fiche en cours de saisie |
| `useFormDraft` | Brouillon automatique dans le stockage local (utilisé par la fiche « Sondage sol » seulement) |
| `useSurveyPhotoField`, `useSurveyPhotos` | Gestion d'un champ photo : sélection, compression, envoi, aperçu |
| `useSurveySubmit` | Enregistrement générique d'une fiche avec photos |
| `useSyncQueue` | État et relance de la file d'attente hors-ligne |
| `useNavigationBlocker` | Confirmation avant de quitter un formulaire modifié |
| `useGeolocation` | Position GPS avec délai maximal de 20 secondes et repli sur la saisie manuelle |
| `useWeather` | Météo du lieu pour le tableau de bord et les fiches |
| `usePdfGenerator` | Lancement d'un export PDF avec suivi d'état |
| `useDeviceContext` | Type d'appareil (mobile, tablette, ordinateur) et orientation, d'après la taille de l'écran |

## Cache et requêtes

Les lectures passent par TanStack Query (`lib/queryClient.ts`) :

- une donnée est considérée fraîche pendant 5 minutes, puis rechargée en arrière-plan ;
- mode `offlineFirst` : sans réseau, le cache est servi sans erreur ;
- le cache des requêtes réussies est copié dans le stockage local du navigateur et réutilisé pendant 24 heures (`lib/queryPersistence.ts`), ce qui permet d'ouvrir l'application sans réseau et de retrouver la liste des sites.

## Stockage local sur l'appareil

Tout ce que l'application écrit dans le navigateur :

| Clé ou base | Support | Contenu |
| --- | --- | --- |
| `hub-environnement-auth` | localStorage ou sessionStorage | Session Supabase. En localStorage, avec expiration à 30 jours, si « Se souvenir de moi » est coché ; sinon en sessionStorage (perdue à la fermeture de l'onglet) |
| `hub-environnement-remember-me`, `…-expiry` | localStorage | Choix « Se souvenir de moi » |
| `rememberedEmail` | localStorage | Dernière adresse email saisie à la connexion |
| `hub-shield-query-cache-v1` | localStorage | Cache des requêtes (24 h) |
| `draft_<type>_<siteId>` | localStorage | Brouillon d'une fiche « Sondage sol » en cours de création |
| `pending_surveys_v1` | localStorage | File d'attente des fiches à envoyer |
| `pending_sites_v1` | localStorage | File d'attente des sites à envoyer |
| `offline-cache:site:<id>` | localStorage | Copie d'un site ouvert en modification |
| `theme` | localStorage | Thème clair ou sombre |
| base IndexedDB des photos | IndexedDB | Fichiers image en attente d'envoi (`lib/offline/indexedDbPhotos.ts`) |

Ces noms sont des identifiants techniques. Les modifier ferait perdre aux utilisateurs leurs brouillons et leurs fiches en attente : ne pas les renommer sans prévoir une reprise des anciennes clés.

## Services externes

| Service | Usage | Fichier | Clé |
| --- | --- | --- | --- |
| Supabase | Données, comptes, photos | `lib/supabase.ts` | Clé publique du projet |
| Nominatim / OpenStreetMap | Recherche d'adresse à la création d'un site (via `leaflet-geosearch`) | `pages/NewSite.tsx` | Aucune |
| Base Adresse Nationale (`api-adresse.data.gouv.fr`) | Recherche de commune. Présente dans `components/CityAutocomplete.tsx`, composant qui n'est plus utilisé par aucun écran | — | Aucune |
| Open-Meteo | Météo et géocodage inverse | `hooks/useWeather.ts` | Aucune |
| Tuiles OpenStreetMap et CARTO | Fonds de carte | `components/dashboard/SitesMap.tsx`, `components/SiteCard.tsx` | Aucune |
| Google Fonts | Police Inter | `index.html` | Aucune |
| cdnjs, GitHub (raw) | Icônes des marqueurs Leaflet | `pages/NewSite.tsx`, `components/dashboard/SitesMap.tsx` | Aucune |

Tout nouveau domaine appelé par l'application doit être ajouté à la politique de sécurité de contenu dans `netlify.toml`, sans quoi le navigateur bloquera les requêtes en production (voir [06 — Déploiement](06-deploiement.md)).

## PWA

Configurée dans `vite.config.ts` (extension `vite-plugin-pwa`) et enregistrée dans `src/pwa.ts`.

- Tous les fichiers du site, modèles PDF compris, sont mis en cache à l'installation : l'application et l'export PDF fonctionnent sans réseau.
- Mise à jour automatique : le service worker vérifie chaque minute s'il existe une nouvelle version et l'active sans demander.
- Si un onglet resté ouvert réclame un fichier d'une ancienne version qui n'existe plus, la page se recharge une fois (gestion de l'événement `vite:preloadError` dans `main.tsx`).
- Les réponses de la Base Adresse Nationale et d'Open-Meteo sont mises en cache (réseau d'abord, cache en secours) ; les tuiles OpenStreetMap sont gardées 7 jours.

## Conventions du code

- Langue : identifiants en anglais ou en français selon le domaine (les noms des champs de fiche sont en français car ils reprennent ceux des modèles PDF), commentaires et textes d'interface en français.
- Base de données : noms en `snake_case`. Le formulaire de site utilise du `camelCase` et convertit à l'enregistrement.
- Styles : classes Tailwind. Les couleurs et effets communs sont des variables CSS déclarées dans `src/index.css` et reprises dans `tailwind.config.js`.
- Messages de validation : en français, centralisés dans `lib/zodFrenchMessages.ts`.
