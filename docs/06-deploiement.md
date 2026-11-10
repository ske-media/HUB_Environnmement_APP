# 06 — Déploiement

L'application existe sous deux formes, construites à partir du même code :

- le **site web** (PWA), hébergé sur Netlify ;
- l'**application Android**, qui embarque une copie du site dans une enveloppe Capacitor.

Les adresses, comptes et accès propres à l'installation de HUB Environnement ne figurent pas dans ce dépôt. Ils sont à réunir dans le tableau de [08 — Passation](08-passation.md).

## Site web (Netlify)

### Ce que fait Netlify

La configuration est dans `netlify.toml` :

| Réglage | Valeur |
| --- | --- |
| Commande de build | `npm run build` |
| Dossier publié | `dist` |
| Version de Node | 20 |
| Redirection | Toutes les adresses renvoient `index.html` (application à page unique) |
| En-têtes | Sécurité et cache, voir plus bas |

### Variables d'environnement

À définir dans l'interface Netlify (**Site configuration > Environment variables**), pas dans le dépôt :

| Variable | Valeur |
| --- | --- |
| `VITE_SUPABASE_URL` | URL du projet Supabase de production |
| `VITE_SUPABASE_ANON_KEY` | Clé publique de ce projet |

Ces valeurs sont inscrites dans le JavaScript **au moment du build**. Les modifier dans Netlify ne change rien tant qu'un nouveau déploiement n'a pas été lancé.

`netlify.toml` demande à l'analyse de secrets de Netlify d'ignorer ces deux variables (`SECRETS_SCAN_OMIT_KEYS`) : elles sont publiques par nature et leur présence dans les fichiers produits ferait sinon échouer le build.

### Déployer

Si le site Netlify est relié au dépôt Git, chaque envoi sur la branche de production déclenche un déploiement. Le site d'origine était relié à un autre dépôt : **la liaison doit être refaite vers ce dépôt-ci** (Netlify : **Site configuration > Build & deploy > Repository**), ou un nouveau site doit être créé à partir de lui.

Déploiement manuel, sans liaison Git :

```bash
npm ci
npm run build                      # avec les variables de production dans l'environnement
npx netlify-cli deploy --prod --dir=dist
```

### Après un changement de domaine ou de projet Supabase

Trois endroits sont à mettre à jour ensemble :

1. **Supabase, Authentication > URL Configuration.** « Site URL » = adresse du site. « Redirect URLs » : `https://<domaine>/login` et `https://<domaine>/auth/update-password`. Sans cela, les liens des emails de confirmation et de réinitialisation renvoient vers une mauvaise adresse.
2. **Netlify.** Les deux variables d'environnement, puis un nouveau déploiement.
3. **`netlify.toml`, en-tête `Content-Security-Policy`.** La directive `connect-src` contient l'adresse du projet Supabase d'origine en plus du motif `https://*.supabase.co`. Le motif suffit pour tout projet hébergé par Supabase ; l'adresse explicite peut être retirée ou remplacée.

### En-têtes de sécurité

Définis pour toutes les pages dans `netlify.toml` :

| En-tête | Effet |
| --- | --- |
| `Content-Security-Policy` | Liste des domaines que le navigateur a le droit de contacter. **Tout nouveau service appelé par l'application (API, tuiles de carte, polices, images) doit y être ajouté**, sinon il sera bloqué en production alors qu'il fonctionne en développement |
| `Strict-Transport-Security` | HTTPS obligatoire |
| `X-Frame-Options: DENY` | Interdit l'affichage du site dans une autre page |
| `X-Content-Type-Options`, `Referrer-Policy` | Durcissements standards |
| `Permissions-Policy` | Autorise la géolocalisation, interdit le micro, la caméra et d'autres capteurs |
| `Cache-Control: no-cache, no-store, must-revalidate` | Aucune mise en cache HTTP ; le cache est géré par le service worker de la PWA |

Deux points à connaître :

- `Permissions-Policy` contient `camera=()`. La prise de photo par le sélecteur de fichiers du téléphone n'est pas concernée, mais le **lecteur de code-barres** de la fiche « Sondage sol », qui ouvre la caméra dans la page, l'est. Son fonctionnement sur le site web de production est à vérifier ; s'il est bloqué, remplacer `camera=()` par `camera=(self)`.
- La politique de contenu autorise `'unsafe-inline'` et `'unsafe-eval'` pour les scripts, ce qui en réduit la portée. Voir [07 — Sécurité](07-securite.md).

### Vérifier un déploiement

1. Ouvrir le site en navigation privée, se connecter.
2. Ouvrir un site, une fiche, exporter un PDF.
3. Dans la console du navigateur, vérifier l'absence d'erreur « Refused to connect » ou « Refused to load » (blocage par la politique de contenu).
4. Sur un téléphone, vérifier la prise de photo et la géolocalisation.

Les utilisateurs dont l'application est déjà ouverte reçoivent la nouvelle version automatiquement, dans la minute, sans action de leur part.

### Revenir en arrière

Dans Netlify, menu **Deploys**, choisir un déploiement précédent et « Publish deploy ». Le retour est immédiat. Il ne concerne que le site : une migration de base appliquée entre-temps n'est pas annulée.

## Application Android

> **Limite de ce document.** Le projet Android n'a pas pu être compilé lors de la préparation de ce dépôt. Les commandes ci-dessous sont celles prévues par Capacitor ; les valeurs citées sont celles lues dans les fichiers du dossier `android/`.

### Principe

Capacitor copie le contenu de `dist/` dans le projet Android et l'affiche dans une vue web plein écran. L'application Android est donc le site web, livré avec l'application au lieu d'être téléchargé.

Conséquences :

- les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` utilisées sont celles présentes **au moment du `npm run build`** qui précède la synchronisation ;
- une mise à jour du site web ne met pas à jour l'application Android : il faut reconstruire et redistribuer l'application ;
- les en-têtes de `netlify.toml` ne s'appliquent pas dans l'application.

### Identité de l'application

| Élément | Valeur | Fichier |
| --- | --- | --- |
| Identifiant | `com.hubenvironnement.app` | `capacitor.config.ts`, `android/app/build.gradle` |
| Nom affiché | HUB Environnement | `android/app/src/main/res/values/strings.xml` |
| `versionCode` / `versionName` | `1` / `1.0` | `android/app/build.gradle` |
| SDK minimal / cible | 23 / 35 | `android/variables.gradle` |
| Autorisations | Internet, caméra, lecture des images | `android/app/src/main/AndroidManifest.xml` |

### Prérequis

- Android Studio récent, avec le SDK Android 35.
- JDK 21 (le projet compile en Java 21).
- Les dépendances du projet installées (`npm ci`) : le projet Android référence des fichiers situés dans `node_modules/`.

### Construire

```bash
npm ci
npm run android:sync      # build web + copie dans android/
npm run android:open      # ouvre Android Studio
```

Dans Android Studio : **Run** pour installer sur un téléphone branché ou un émulateur ; **Build > Generate Signed App Bundle / APK** pour produire un fichier à distribuer.

En ligne de commande, pour un APK de test non signé pour la distribution :

```bash
cd android
./gradlew assembleDebug
# fichier produit : android/app/build/outputs/apk/debug/app-debug.apk
```

### Ce qui reste à mettre en place

| Sujet | État | À faire |
| --- | --- | --- |
| Signature | Aucune configuration de signature dans le dépôt | Créer ou récupérer la clé de signature (keystore). **Une application déjà installée ne peut être mise à jour que par un fichier signé avec la même clé** : si une version circule déjà, sa clé doit être transmise. Ne jamais versionner la clé ni ses mots de passe |
| Numéro de version | `versionCode 1`, `versionName "1.0"`, alors que le site est en 2.0.1 | Augmenter `versionCode` à chaque diffusion (obligatoire pour qu'Android accepte la mise à jour) et aligner `versionName` |
| Versions de Capacitor | L'outil en ligne de commande (`@capacitor/cli`) est en version 7, les bibliothèques (`@capacitor/core`, `@capacitor/android`) en version 8 | Aligner l'outil sur la version 8, relancer `npx cap sync android` et vérifier la compilation. Les versions de SDK du dossier `android/` ont été générées par l'outil en version 7 |
| Mode de diffusion | Non documenté dans le dépôt | À préciser : fichier APK transmis directement, ou publication sur Google Play |

### Particularités du code pour Android

- `lib/nativeCamera.ts` utilise l'appareil photo natif quand l'application tourne dans Capacitor, et le sélecteur de fichiers du navigateur sinon. Trois méthodes de lecture du fichier sont essayées successivement, parce que le chemin renvoyé par Android n'est pas toujours lisible depuis la vue web.
- Les photos prises depuis l'application Android sont aussi enregistrées dans la galerie du téléphone (option `saveToGallery` de l'extension Camera). Sur ordinateur, `lib/saveToCameraRoll.ts` télécharge à la place une copie locale de la photo prise.
- Les autorisations de lecture des images sont déclarées par tranche de version d'Android dans le manifeste ; les modifier demande de tester sur un Android 13 ou plus récent et sur une version plus ancienne.

Il n'existe pas de projet iOS. L'application reste utilisable sur iPhone par le site web, installable sur l'écran d'accueil depuis Safari.
