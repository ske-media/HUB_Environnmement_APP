# HUB Environnement — Application terrain

Application de saisie des fiches de prélèvement utilisée sur le terrain par les équipes de HUB Environnement : création des sites (dossiers d'affaire), saisie des fiches depuis un téléphone ou un ordinateur, fonctionnement sans réseau, photos, et export des fiches au format PDF officiel.

- **Version** : 2.0.1
- **Auteur** : Steven C. K. ELDRING
- **Destinataire** : HUB Environnement

Ce dépôt est le dépôt de passation. Il contient le code complet de l'application, le schéma de la base de données et toute la documentation nécessaire pour reprendre le projet.

> **Vous reprenez le projet ?** Lisez dans l'ordre : ce README, puis [docs/01-installation.md](docs/01-installation.md), puis [docs/08-passation.md](docs/08-passation.md). Ce dernier liste ce qui doit vous être transmis (accès, comptes) et l'état réel du code, y compris ses défauts connus.

## Ce que fait l'application

| Fonction | Détail |
| --- | --- |
| Sites | Création, modification, archivage, corbeille. Un site = un client, un numéro d'affaire, une commune, une position GPS. |
| Fiches | 4 types de fiches en service : **gaz du sol**, **sondage sol**, **eau souterraine**, **campagne PID**. 12 autres types existent dans le code mais sont désactivés (voir [docs/04-fiches-et-pdf.md](docs/04-fiches-et-pdf.md)). |
| Hors-ligne | Une fiche enregistrée sans réseau est gardée sur l'appareil puis envoyée automatiquement au retour de la connexion. |
| Photos | Prise de vue ou sélection, compression sur l'appareil, envoi dans le stockage Supabase. |
| PDF | Remplissage des modèles PDF officiels (formulaires AcroForm), export unitaire, fusionné ou en archive ZIP. |
| Comptes | Connexion par email et mot de passe, inscription réservée aux adresses `@hub-environnement.com`. |

L'application est une PWA (installable depuis le navigateur) et existe aussi en application Android, construite à partir du même code avec Capacitor.

## Technologies

| Domaine | Choix |
| --- | --- |
| Interface | React 18, TypeScript, Vite 5, Tailwind CSS 3, Framer Motion |
| Navigation | React Router 6 (Data Router) |
| Données | Supabase : PostgreSQL, authentification, stockage de fichiers |
| Cache et requêtes | TanStack Query 5, cache persisté dans le navigateur |
| Formulaires | React Hook Form, validation Zod 4 |
| PDF | pdf-lib (remplissage de formulaires AcroForm), JSZip |
| Cartes | Leaflet, React Leaflet, fonds OpenStreetMap et CARTO |
| Mobile | PWA (vite-plugin-pwa / Workbox), Capacitor 8 pour Android |
| Hébergement | Netlify (site statique) |

Il n'y a pas de serveur applicatif à maintenir : le navigateur parle directement à Supabase, et les droits d'accès sont appliqués par la base de données (politiques RLS).

## Démarrage rapide

Prérequis : Node.js 20 ou plus récent, npm, et les deux valeurs de connexion au projet Supabase.

```bash
git clone https://github.com/ske-media/HUB_Environnmement_APP.git
cd HUB_Environnmement_APP
npm ci
cp .env.example .env.local
# renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local
npm run dev
```

L'application est alors disponible sur http://localhost:5173. Le détail, y compris la mise en place d'une base de test, est dans [docs/01-installation.md](docs/01-installation.md).

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement (port 5173) |
| `npm run build` | Build de production dans `dist/` |
| `npm run preview` | Sert le build de production en local (port 4173) |
| `npm test` | Tests automatiques (correspondance des champs PDF, file d'attente hors-ligne) |
| `npm run check:pdf` | Audit des modèles PDF par rapport aux schémas des fiches |
| `npm run lint` | Analyse statique ESLint |
| `npm run typecheck` | Vérification des types TypeScript |
| `npm run android:sync` | Build web puis copie dans le projet Android |
| `npm run android:open` | Ouvre le projet Android dans Android Studio |

`npm run lint` et `npm run typecheck` signalent aujourd'hui des erreurs connues, décrites et chiffrées dans [docs/08-passation.md](docs/08-passation.md). Elles n'empêchent ni le build ni le fonctionnement de l'application.

## Organisation du dépôt

```
.
├── src/                    Code de l'application
│   ├── pages/              Écrans (tableau de bord, sites, paramètres, connexion…)
│   │   └── surveys/        Un formulaire par type de fiche
│   ├── components/         Composants d'interface réutilisables
│   ├── schema/             Schémas Zod : structure et validation de chaque fiche
│   ├── hooks/              Logique réutilisable (sites, utilisateurs, soumission, GPS…)
│   ├── contexts/           Authentification, thème, notifications, boîtes de dialogue
│   └── lib/                Client Supabase, hors-ligne, photos, génération PDF
├── public/pdf-templates/   Modèles PDF officiels à remplir
├── supabase/
│   ├── migrations/         Schéma de la base, à appliquer dans l'ordre
│   ├── scripts/            Scripts SQL d'administration
│   └── config.toml         Configuration de la CLI Supabase (développement local)
├── android/                Projet Android (Capacitor)
├── scripts/                Tests et audit PDF exécutables avec Node
├── docs/                   Documentation
├── netlify.toml            Build, redirections et en-têtes de sécurité
└── .env.example            Modèle des variables d'environnement
```

## Documentation

| Document | Contenu |
| --- | --- |
| [01 — Installation](docs/01-installation.md) | Poste de développement, variables d'environnement, base de test |
| [02 — Architecture](docs/02-architecture.md) | Organisation du code, parcours d'une donnée, services externes |
| [03 — Base de données](docs/03-base-de-donnees.md) | Tables, droits d'accès, fonctions, stockage, migrations |
| [04 — Fiches et PDF](docs/04-fiches-et-pdf.md) | Fonctionnement d'une fiche, export PDF, ajouter ou activer un type |
| [05 — Hors-ligne et photos](docs/05-hors-ligne-et-photos.md) | File d'attente, brouillons, synchronisation, photos |
| [06 — Déploiement](docs/06-deploiement.md) | Mise en production web (Netlify) et application Android |
| [07 — Sécurité](docs/07-securite.md) | Modèle d'accès, réglages Supabase, points à traiter |
| [08 — Passation](docs/08-passation.md) | Accès à transmettre, état du code, travaux recommandés |

## Auteur

Application conçue et développée par **Steven C. K. ELDRING** pour HUB Environnement.
