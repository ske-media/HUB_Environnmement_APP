# 08 — Passation

Ce document s'adresse à la personne qui reprend le projet. Il réunit ce qui doit lui être transmis en dehors du code, l'état réel de l'application, et les travaux recommandés.

## 1. Ce qui doit être transmis avec ce dépôt

Le dépôt contient le code et le schéma de la base. Il ne contient ni les données, ni les accès. Le tableau ci-dessous est à compléter par l'auteur au moment de la passation ; aucune de ces informations ne doit être écrite dans le dépôt.

| Élément | À transmettre | Renseigné |
| --- | --- | --- |
| Dépôt Git | Accès en écriture, ou transfert de propriété du dépôt à HUB Environnement | ☐ |
| Projet Supabase de production | Référence du projet ; transfert du projet à une organisation Supabase appartenant à HUB Environnement, ou invitation comme propriétaire | ☐ |
| Site Netlify | Adresse du site en production ; transfert du site à une équipe Netlify de HUB Environnement, ou invitation | ☐ |
| Nom de domaine | Domaine utilisé, où il est enregistré, qui gère sa zone DNS | ☐ |
| Envoi des emails | Le service d'envoi configuré dans Supabase pour les emails de confirmation et de réinitialisation (celui fourni par défaut est limité à quelques messages par heure) | ☐ |
| Application Android | Mode de diffusion actuel (fichier APK ou Google Play), compte utilisé, et **clé de signature** avec ses mots de passe si une version a déjà été diffusée | ☐ |
| Comptes administrateurs | Liste des comptes ayant le rôle `super_admin` | ☐ |
| Modèles PDF | Fichiers sources des modèles officiels et nom de l'outil utilisé pour en modifier les champs | ☐ |
| Sauvegardes | Offre Supabase souscrite et politique de sauvegarde en place | ☐ |

Deux transferts demandent une action des deux parties et ne peuvent pas être faits par un simple partage de mot de passe : le projet Supabase (transfert entre organisations, dans les réglages généraux du projet) et le site Netlify (transfert entre équipes). Tant qu'ils ne sont pas faits, la production dépend des comptes de l'auteur.

### Après le transfert, à faire par le repreneur

1. Relier le site Netlify à ce dépôt (voir [06 — Déploiement](06-deploiement.md)) et vérifier qu'un déploiement aboutit.
2. Comparer les migrations du dépôt à la base de production (voir [03 — Base de données](03-base-de-donnees.md), « Vérifier l'alignement avec la production »).
3. Contrôler les réglages Supabase listés dans [07 — Sécurité](07-securite.md), en commençant par les inscriptions.
4. Retirer les accès de l'auteur une fois la reprise confirmée, et renouveler les secrets qu'il a pu connaître (mots de passe de la clé de signature Android, jetons d'accès Supabase et Netlify personnels).

## 2. Opérations courantes

| Besoin | Marche à suivre |
| --- | --- |
| Ajouter un collaborateur | Il crée son compte depuis l'écran d'inscription, ou il est invité depuis Supabase (**Authentication > Users**). Pour qu'il apparaisse dans les listes « Prélèveur » et « Chef de projet », ajouter son identifiant à `src/lib/constants/allowedFieldUsers.ts`, puis redéployer |
| Retirer un collaborateur | Bannir ou supprimer son compte dans Supabase. Retirer son identifiant de `allowedFieldUsers.ts`, puis redéployer. Les fiches qu'il a saisies conservent son nom |
| Nommer un administrateur | Script `supabase/scripts/assign_super_admin.sql` |
| Restaurer un site ou une fiche supprimé | Paramètres > Corbeille |
| Remplacer un modèle PDF | [04 — Fiches et PDF](04-fiches-et-pdf.md), « Modifier une fiche existante » |
| Publier une nouvelle version | [06 — Déploiement](06-deploiement.md). Mettre à jour le numéro de version dans `package.json` |

La liste des prélèveurs et chefs de projet est écrite dans le code, sous forme de sept identifiants de comptes accompagnés du nom de la personne en commentaire. Toute arrivée ou tout départ demande donc une modification du code et un déploiement. C'est le premier point à faire évoluer si l'équipe change souvent (voir section 5).

## 3. État de l'application

### Ce qui est en service et fonctionne

- Connexion, inscription, mot de passe oublié, modification du profil et du mot de passe.
- Sites : création, modification, archivage, corbeille, restauration, suppression définitive.
- Fiches gaz du sol, sondage sol, eau souterraine, campagne PID : création, modification, déplacement vers un autre site, corbeille.
- Enregistrement hors-ligne des sites et des fiches, synchronisation automatique.
- Photos, avec envoi différé hors-ligne.
- Export PDF unitaire, fusionné, ou en archive ZIP.
- Tableau de bord : statistiques, activité récente, carte des sites, météo.
- Installation en PWA.

### Ce qui est présent dans le code mais pas en service

| Élément | État |
| --- | --- |
| 12 types de fiches (air ambiant, eau superficielle, piézométrie, eau du robinet, sédiments, suivi de fouille, analyse des risques, radon, visite de site, suivi matériel, questionnaire jardin, visite ICPE) | Formulaires inachevés, non proposés à l'utilisateur. Onze d'entre eux n'ont pas de modèle PDF valide. Détail dans [04 — Fiches et PDF](04-fiches-et-pdf.md) |
| Onglet « Administration » des paramètres | Écran d'attente : gestion des utilisateurs et statistiques affichées comme « à venir », boutons désactivés |
| Liste « Appareils connectés » de l'onglet « Sécurité » | Donnée fictive écrite en dur (voir [07 — Sécurité](07-securite.md), point 6) |
| Suppression de compte | Enregistre la demande mais ne supprime rien (voir [07 — Sécurité](07-securite.md), point 5) |

### Fichiers qui ne sont plus utilisés

Les fichiers suivants ne sont importés par aucun autre. Ils ont été conservés tels quels ; ils peuvent être supprimés, ou repris si la fonction correspondante est souhaitée.

| Fichier | Contenu |
| --- | --- |
| `src/pages/Archives.tsx` | Ancien écran des archives et de la corbeille, sans route. Remplacé par l'onglet « Corbeille » des paramètres |
| `src/components/CityAutocomplete.tsx` | Recherche de commune par la Base Adresse Nationale |
| `src/components/OfflineBanner.tsx` | Bandeau « hors-ligne » |
| `src/components/Spinner.tsx`, `ThemeToggle.tsx` | Indicateur de chargement, bascule de thème |
| `src/components/dashboard/FieldWeatherWidget.tsx`, `NearbySites.tsx`, `QuickSurveyGrid.tsx` | Blocs de tableau de bord non affichés |
| `src/components/forms/fields/SwitchField.tsx` | Champ interrupteur |
| `src/hooks/useSurveyGeolocation.ts`, `src/lib/utils/siteUtils.ts` | Utilitaires sans appelant |

`src/components/Footer.tsx` est importé par plusieurs écrans mais n'affiche rien.

## 4. Qualité du code : état mesuré

Mesures faites sur ce dépôt au moment de la passation.

| Contrôle | Commande | Résultat |
| --- | --- | --- |
| Build de production | `npm run build` | Réussit |
| Tests automatiques | `npm test` | Réussissent (2 scripts) |
| Migrations rejouées sur une base vide | — | Réussissent |
| Types TypeScript | `npm run typecheck` | **317 erreurs** |
| Analyse statique | `npm run lint` | **191 erreurs**, 17 avertissements |
| Avis de sécurité des dépendances | `npm audit` | Avis signalés, non triés |

Ces erreurs n'empêchent pas l'application de fonctionner : Vite produit le build sans vérifier les types. Elles signifient en revanche que le compilateur ne joue pas son rôle de garde-fou, et qu'une erreur de nom de champ ou de propriété ne sera pas détectée avant l'exécution.

### Erreurs de types (317)

| Origine | Nombre | Nature |
| --- | --- | --- |
| Formulaires et schémas des 12 types hors service | 146 | Propriétés manquantes ou incompatibles sur les composants de champ. Ces formulaires sont à reprendre de toute façon |
| `src/schema/gasSurveySchema.ts` | 37 | Une seule cause, répétée : `isNaN()` appelé sur une valeur de type inconnu dans les fonctions de conversion des nombres |
| Code en service ou partagé | 77 | Dont `PIDSurveyForm.tsx` (17), `GasSurveyForm.tsx` (8), les deux tableaux de bord (10, typage des animations), `zodFrenchMessages.ts` (6), `Sites.tsx` et `SiteSurveys.tsx` (10) |
| Variables et paramètres inutilisés | 57 | Sans conséquence, nettoyage mécanique |

Jusqu'à cette passation, la commande de vérification des types du projet ne contrôlait en réalité aucun fichier, ce qui explique que ces erreurs se soient accumulées sans être vues. La commande `npm run typecheck` a été corrigée pour contrôler effectivement le code de `src/`.

### Erreurs d'analyse statique (191)

| Règle | Nombre |
| --- | --- |
| Usage du type `any` (`no-explicit-any`) | 133 |
| Variables inutilisées (`no-unused-vars`) | 47 |
| Autres (`no-unsafe-function-type`, `prefer-const`, `no-empty`…) | 11 |
| Avertissements : dépendances de hooks React (`exhaustive-deps`) | 11 |

Les usages de `any` se concentrent dans la génération des PDF et le traitement de `specific_data`, dont la structure varie selon le type de fiche.

### Ce qui n'est pas couvert par des tests

Il n'existe aucun test d'interface ni de test de bout en bout. Les deux scripts de test ne couvrent que la fusion de la file d'attente et la correspondance des boutons radio des PDF, et recopient la logique testée au lieu de l'importer (voir [05 — Hors-ligne et photos](05-hors-ligne-et-photos.md)). Toute modification doit donc être vérifiée à la main, en suivant les parcours décrits dans les documents 01, 05 et 06.

### Autres points techniques

- **Taille du code livré.** Le fichier JavaScript principal pèse environ 1,4 Mo (390 ko compressé) : tous les formulaires, y compris ceux hors service, sont chargés dès l'ouverture. Charger chaque formulaire à la demande (`React.lazy`) réduirait nettement ce poids.
- **Fichiers volumineux.** `GasSurveyForm.tsx` (1 800 lignes), `GroundwaterSurveyForm.tsx` (1 700), `Settings.tsx` (1 200), `SiteSurveys.tsx` (1 100) et `SoilSurveyForm.tsx` (1 100) gagneraient à être découpés.
- **Correspondance des champs PDF.** L'association par ressemblance de noms est pratique mais peut se tromper (voir [04 — Fiches et PDF](04-fiches-et-pdf.md)). Chaque changement de modèle ou de schéma doit être suivi d'un export de contrôle.
- **Capacitor.** L'outil en ligne de commande et les bibliothèques ne sont pas à la même version majeure (voir [06 — Déploiement](06-deploiement.md)).
- **Pas d'intégration continue.** Aucun contrôle automatique n'est lancé à l'envoi du code.

## 5. Travaux recommandés, par ordre de priorité

### À faire sans attendre

1. **Vérifier les inscriptions** dans Supabase et fermer l'accès aux personnes extérieures ([07 — Sécurité](07-securite.md), point 1).
2. **Finaliser les transferts** de propriété (Supabase, Netlify, domaine, clé Android) pour que la production ne dépende plus des comptes de l'auteur.
3. **Vérifier les sauvegardes** de la base et prévoir celle des photos.
4. **Comparer les migrations** du dépôt à la base de production.

### À court terme

5. Fermer le listage anonyme des photos ([07 — Sécurité](07-securite.md), point 3).
6. Déplacer le rôle administrateur dans `app_metadata` ([07 — Sécurité](07-securite.md), point 2).
7. Retirer la liste fictive d'appareils connectés et décider du sort de la suppression de compte.
8. Remplacer la liste de prélèveurs écrite dans le code par une donnée gérée en base (par exemple un indicateur dans `app_metadata`, renvoyé par `get_all_users`), pour ne plus dépendre d'un déploiement.
9. Vérifier le lecteur de code-barres sur le site de production ([06 — Déploiement](06-deploiement.md)).
10. Aligner les versions de Capacitor, mettre en place la signature Android et la numérotation des versions.

### Pour assainir le code

11. Corriger les erreurs de types du code en service (114 erreurs en comptant le schéma gaz, dont 37 se règlent d'un seul geste), puis ajouter `npm run typecheck` au build pour empêcher toute régression.
12. Supprimer les fichiers inutilisés, et sortir du dépôt principal les 12 formulaires hors service tant qu'ils ne sont pas repris (ils représentent plus de la moitié des erreurs de types).
13. Mettre en place une intégration continue minimale : `npm ci`, `npm test`, `npm run build`, puis `typecheck` et `lint` une fois remis à zéro.
14. Ajouter des tests de bout en bout sur les parcours critiques : création d'une fiche, enregistrement hors-ligne puis synchronisation, export PDF.
15. Trier les avis de `npm audit` et mettre à jour les dépendances concernées.

### Évolutions fonctionnelles possibles

16. Mettre en service de nouveaux types de fiches, un par un, en suivant la procédure de [04 — Fiches et PDF](04-fiches-et-pdf.md) et en commençant par obtenir les modèles PDF officiels.
17. Historique des modifications des fiches ([07 — Sécurité](07-securite.md), point 4).
18. Écran d'administration réel : gestion des comptes, des rôles et de la liste des prélèveurs.

## 6. Ce qui a été fait pour préparer ce dépôt

Par rapport au dépôt de développement d'origine, sans changement du comportement de l'application :

- reprise du code sans l'historique de développement ;
- retrait des fichiers propres au poste de développement (fichiers temporaires de la CLI Supabase, rapport d'audit généré) et de deux fichiers de configuration sans effet ;
- réécriture complète de la documentation, à partir du code ;
- ajout de `.env.example` et durcissement de `.gitignore` (tous les fichiers `.env*` sont exclus) ;
- correction de l'historique des migrations pour qu'il puisse être rejoué sur une base vide (voir [03 — Base de données](03-base-de-donnees.md)) ;
- correction de la commande `npm run typecheck`, qui ne vérifiait aucun fichier (la même vérification sans effet a été retirée de `npm run build`), et de l'audit PDF, qui signalait à tort des générateurs manquants ;
- suppression des imports inutilisés et nettoyage des commentaires ;
- retrait des symboles en tête de trois messages de synchronisation, qui doublaient l'icône déjà affichée par la notification ;
- langue de la page déclarée en français (`index.html`) ;
- adresses de redirection de la configuration Supabase locale alignées sur le port du serveur de développement.

## 7. Contact

Application conçue et développée par **Steven C. K. ELDRING**.
