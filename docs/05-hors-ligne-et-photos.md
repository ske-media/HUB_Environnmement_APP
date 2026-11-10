# 05 — Fonctionnement hors-ligne et photos

Les équipes saisissent souvent dans des zones sans couverture. L'application est conçue pour qu'une fiche enregistrée ne soit jamais perdue, qu'il y ait du réseau ou non.

## Principe

Tout enregistrement suit le même ordre :

1. l'identifiant de la fiche est créé sur l'appareil ;
2. la fiche est écrite dans une file d'attente locale ;
3. l'envoi au serveur est tenté ;
4. la fiche n'est retirée de la file que lorsque le serveur a confirmé.

Si l'application est fermée, si le téléphone s'éteint ou si le réseau tombe entre les étapes 2 et 4, la fiche est toujours dans la file et sera renvoyée plus tard.

## Ce qui fonctionne sans réseau

| Action | Sans réseau |
| --- | --- |
| Ouvrir l'application | Oui, si elle a déjà été ouverte une fois sur l'appareil |
| Consulter les sites et les fiches | Oui, pour les données consultées dans les dernières 24 heures |
| Créer ou modifier un site | Oui, mis en file d'attente |
| Créer ou modifier une fiche | Oui, mise en file d'attente |
| Ajouter des photos à une fiche | Oui, gardées sur l'appareil jusqu'à l'envoi |
| Exporter un PDF | Oui pour le texte ; les photos, qui doivent être téléchargées depuis le serveur, sont absentes du PDF |
| Se connecter, créer un compte | Non |
| Rechercher une adresse, voir la carte ou la météo | Non, sauf éléments déjà en cache |

## File d'attente des fiches

Code : `src/lib/offline/`.

| Fichier | Rôle |
| --- | --- |
| `submitSurveyUpsert.ts` | Enregistrement d'une fiche : mise en file, tentative d'envoi, traitement du résultat |
| `pendingSurveyQueue.ts` | Lecture et écriture de la file, conservation des photos en attente |
| `pendingSurveyMerge.ts` | Fusion quand une fiche déjà en attente est enregistrée de nouveau |
| `replayPendingSurveys.ts` | Renvoi des fiches en attente |
| `applyQueuedSurveyPhotos.ts` | Envoi des photos en attente et inscription de leur adresse dans la fiche |
| `loadSurveySpecificData.ts` | À l'ouverture d'une fiche, préfère la version en attente à celle du serveur |
| `pendingSiteQueue.ts`, `submitSiteUpsert.ts`, `replayPendingSites.ts` | Même mécanique pour les sites |
| `indexedDbPhotos.ts` | Stockage des fichiers image sur l'appareil |
| `repairSurveyPhotos.ts` | Outil de réparation des photos, voir plus bas |

### Enregistrement d'une fiche

`submitSurveyUpsert` renvoie l'un de deux états :

- `success` : le serveur a enregistré la fiche. L'entrée est retirée de la file.
- `pending` : pas de réseau, ou pas de réponse dans les 30 secondes. La fiche reste dans la file. L'utilisateur voit un message orange qui reste affiché tant que des éléments sont en attente.

Si le serveur **refuse** la fiche pour une raison qui n'est pas liée au réseau (droit insuffisant, donnée invalide), l'entrée est retirée de la file et l'erreur est affichée : la renvoyer échouerait indéfiniment. C'est le seul cas où une fiche saisie n'est pas conservée ; il ne se produit pas en fonctionnement normal mais peut apparaître après une modification du schéma de la base ou de ses droits d'accès.

L'envoi est un `upsert` sur l'identifiant créé à l'étape 1. Envoyer deux fois la même fiche met à jour la même ligne : il n'y a pas de doublon, même en cas de double appui, de nouvelle tentative ou de renvoi après coupure.

### Renvoi automatique

`OfflineSyncManager` (monté dans `Layout`) renvoie la file :

- à chaque ouverture de l'application ;
- à chaque retour du réseau (événement `online` du navigateur).

Les sites sont renvoyés avant les fiches, car une fiche ne peut pas être enregistrée si son site n'existe pas encore sur le serveur. Un message vert indique le nombre d'éléments synchronisés.

Si l'utilisateur tente de fermer l'onglet alors qu'il est hors-ligne avec des éléments en attente, le navigateur affiche un avertissement.

### Modifier une fiche qui attend encore

Quand une fiche en attente est rouverte, c'est la version de la file qui est chargée, pas celle du serveur, qui est plus ancienne. Quand elle est enregistrée de nouveau, la nouvelle saisie remplace l'ancienne dans la file, et les photos en attente des champs non modifiés sont conservées.

### Limites à connaître

- La file est dans le stockage local du navigateur, propre à **un appareil et un navigateur**. Une fiche en attente sur un téléphone n'est visible nulle part ailleurs tant qu'elle n'a pas été envoyée.
- Effacer les données de navigation, ou désinstaller l'application Android, supprime la file et les photos en attente.
- La file est limitée à 2 Mo de texte (les photos n'en font pas partie). Au-delà, l'écriture est refusée et une erreur apparaît dans la console. Cela représente un très grand nombre de fiches et n'a pas vocation à être atteint.
- Deux personnes qui modifient la même fiche : la dernière qui enregistre l'emporte. Il n'y a pas de détection de conflit.

## Mise en cache des données

En complément de la file d'attente, les données déjà consultées restent disponibles hors-ligne grâce au cache des requêtes, conservé 24 heures sur l'appareil (voir [02 — Architecture](02-architecture.md)). Les fichiers de l'application et les modèles PDF sont mis en cache par le service worker de la PWA.

## Brouillon de la fiche « Sondage sol »

La fiche « Sondage sol » enregistre en plus un brouillon local pendant la saisie, deux secondes après la dernière modification (`hooks/useFormDraft.ts`). Au retour sur le formulaire, une bannière propose de reprendre le brouillon ou de l'abandonner. Le brouillon ne contient ni photo ni fichier, et il est supprimé une fois la fiche enregistrée. Les autres fiches n'ont pas ce mécanisme : une saisie non enregistrée y est perdue si la page est fermée.

## Photos

Code : `src/lib/photos/surveyPhotoPipeline.ts`, `src/hooks/useSurveyPhotoField.ts`, `src/components/forms/Photo*.tsx`.

### Parcours d'une photo

1. **Sélection.** Sur téléphone, le formulaire propose de prendre une photo ou d'en choisir une ; sur ordinateur, de choisir un fichier. Dans l'application Android, la prise de vue passe par l'appareil photo natif (`lib/nativeCamera.ts`, extension Capacitor Camera).
2. **Compression** sur l'appareil : 1 600 pixels au plus sur le grand côté, 1 Mo visé. Si la compression échoue, le fichier d'origine est conservé pour ne pas bloquer la saisie.
3. **Envoi** dans l'espace de stockage `survey-photos`, à l'adresse `sites/<siteId>/<type>/<horodatage>-<champ>.<extension>`.
4. **Inscription dans la fiche** de l'adresse publique de la photo.

Sans réseau, les étapes 3 et 4 sont différées : le fichier est gardé sur l'appareil (IndexedDB) et le champ de la fiche reste vide jusqu'au renvoi, où la photo est envoyée puis son adresse inscrite dans la fiche.

### Règle importante : jamais d'adresse `blob:` dans la base

Pendant la saisie, le navigateur affiche l'aperçu d'une photo par une adresse temporaire commençant par `blob:`. Cette adresse n'est valable que dans la page ouverte : enregistrée dans une fiche, elle deviendrait un lien mort au premier rechargement.

`sanitizeSpecificData` retire donc toute adresse `blob:` avant chaque écriture dans la file ou dans la base, et `resolveSurveyPhotoUrl` renvoie « pas d'image » pour une telle adresse, ce qui affiche un emplacement vide plutôt qu'une image cassée. Toute nouvelle écriture de fiche doit passer par ces fonctions.

### Outil de réparation

Des versions antérieures de l'application ont pu enregistrer des adresses `blob:` dans certaines fiches. L'écran **Paramètres** propose le bouton « Analyser et réparer les photos locales » (`repairSurveyPhotos.ts`). Lancé sur l'appareil qui a pris les photos, il :

1. retrouve les fichiers encore présents sur l'appareil, les envoie et corrige les fiches concernées ;
2. vide les champs dont la photo n'est plus récupérable.

Les fichiers gardés sur l'appareil et qui ne sont plus rattachés à aucune fiche en attente sont supprimés automatiquement au bout de 7 jours.

### Photos dans les PDF

À l'export, chaque photo est téléchargée depuis son adresse publique, redressée selon son orientation et dessinée dans la zone prévue du modèle, sans déformation (`lib/pdf-generators/embedPhoto.ts`).

## Tests automatiques

```bash
npm test
```

| Script | Ce qu'il vérifie |
| --- | --- |
| `scripts/pendingSurveyMerge.selftest.mjs` | La fusion d'une fiche en attente enregistrée plusieurs fois, et le choix de la version en attente à la réouverture |
| `scripts/pdfRadioMatching.selftest.mjs` | La correspondance entre valeurs et options Oui/Non des PDF |

Ces deux scripts recopient la logique qu'ils testent au lieu d'importer les fichiers de `src/` : **si la logique est modifiée dans `src/`, le script correspondant doit être mis à jour à la main**, sinon il continue de réussir sans rien prouver. Il n'existe pas d'autre test automatique dans le projet.

## Vérifier le comportement hors-ligne à la main

1. Ouvrir l'application en étant connecté, afficher un site.
2. Dans les outils de développement du navigateur, onglet Network, choisir « Offline ».
3. Créer une fiche avec une photo et l'enregistrer : un message orange signale la sauvegarde locale, la fiche apparaît dans la liste.
4. Recharger la page, toujours hors-ligne : la fiche est toujours là.
5. Repasser en ligne : un message vert signale la synchronisation.
6. Vérifier dans le tableau de bord Supabase que la fiche existe et que la photo est dans le stockage.

Le contenu de la file se lit dans l'onglet Application des outils de développement : Local Storage, clé `pending_surveys_v1`.
