# 07 — Sécurité

Ce document décrit le modèle de sécurité de l'application, les réglages à contrôler dans Supabase et les faiblesses connues, classées par priorité.

> **Limite de ce document.** Il repose sur la lecture du code et des migrations de ce dépôt. Les réglages réels du projet Supabase de production (inscriptions, confirmation par email, politiques en place) n'ont pas été consultés. Les points marqués « à vérifier » doivent l'être dans le tableau de bord du projet.

## Modèle

L'application n'a pas de serveur intermédiaire. Le navigateur dialogue avec Supabase au moyen de deux valeurs publiques : l'URL du projet et la clé `anon`. Ces valeurs sont lisibles par quiconque ouvre le site ; elles identifient le projet, elles ne donnent aucun droit.

Les droits viennent de la session de l'utilisateur connecté, et sont appliqués **par la base de données** au moyen des politiques RLS. Tout contrôle fait dans le code React (masquer un bouton, refuser un formulaire) n'est qu'un confort d'interface : un utilisateur peut appeler Supabase directement, sans passer par l'application.

De là découle la règle de base pour toute évolution : **une règle de sécurité qui n'est pas écrite dans la base n'existe pas.**

La clé `service_role`, qui contourne toutes les politiques, n'est utilisée nulle part dans ce projet et ne doit jamais y entrer.

### Qui peut faire quoi

| Qui | Droits |
| --- | --- |
| Visiteur non connecté | Aucun accès aux tables. Peut afficher et lister les photos (voir point 3). Peut demander la création d'un compte (voir point 1) |
| Utilisateur connecté | Lit, crée et modifie tous les sites et toutes les fiches. Supprime définitivement seulement ce qu'il a créé. Dépose et supprime des photos |
| `super_admin` | Mêmes droits. Voit en plus l'onglet « Administration », qui ne contient aujourd'hui aucune fonction active |

Il s'agit d'un modèle collaboratif assumé : tous les collaborateurs travaillent sur les mêmes dossiers. Le détail des politiques est dans [03 — Base de données](03-base-de-donnees.md).

## Réglages Supabase à contrôler

Dans le tableau de bord du projet de production :

| Réglage | Emplacement | Valeur attendue |
| --- | --- | --- |
| Création de comptes | Authentication > Sign In / Providers | Voir point 1 ci-dessous |
| Confirmation par email | Authentication > Sign In / Providers > Email | Activée. Le fichier `supabase/config.toml` la désactive, mais il ne concerne que le développement local |
| Longueur minimale du mot de passe | Authentication > Sign In / Providers > Email | 10 caractères, comme dans `config.toml`. L'écran de réinitialisation de l'application n'en exige que 8 : c'est le réglage Supabase qui fait foi |
| Adresses de redirection | Authentication > URL Configuration | Uniquement le domaine de production (voir [06 — Déploiement](06-deploiement.md)) |
| Limites de fréquence | Authentication > Rate Limits | Valeurs par défaut au minimum |
| Sauvegardes | Database > Backups | Actives |
| Conseils de sécurité | Advisors > Security | À consulter : Supabase y signale les tables sans RLS et les fonctions à durcir |

## Points à traiter

### 1. L'inscription n'est pas réellement réservée à HUB Environnement — priorité haute

La restriction aux adresses `@hub-environnement.com` est faite uniquement dans le formulaire d'inscription (`src/pages/Signup.tsx`), par un test qui vérifie que l'adresse **contient** ce texte.

- Une adresse comme `quelquun@hub-environnement.com.exemple.org` passe le test.
- Surtout, le formulaire peut être ignoré : la création de compte est un appel public à Supabase, réalisable par n'importe qui avec la clé publique.

Comme tout utilisateur connecté lit et modifie l'ensemble des sites et des fiches, une personne extérieure qui parvient à créer et confirmer un compte accède à toutes les données.

À vérifier d'abord : si les inscriptions sont désactivées dans le projet Supabase de production, le risque n'existe pas.

Corrections possibles, de la plus simple à la plus souple :

1. **Désactiver les inscriptions** dans Supabase (« Allow new users to sign up ») et créer les comptes par invitation depuis le tableau de bord (**Authentication > Users > Invite user**). L'écran d'inscription de l'application devient alors inutile et peut être retiré.
2. Garder l'inscription ouverte mais **refuser côté serveur** toute adresse hors domaine, au moyen d'un « Auth Hook » Supabase de type *before user created*, ou d'un déclencheur sur `auth.users`.

Dans les deux cas, parcourir la liste des comptes existants pour repérer d'éventuels intrus.

### 2. Le rôle administrateur est modifiable par l'utilisateur — priorité moyenne

Le rôle est stocké dans les métadonnées « utilisateur » du compte (`user_metadata.role`), que chaque utilisateur peut modifier lui-même par un simple appel à Supabase. N'importe quel utilisateur connecté peut donc se déclarer `super_admin`.

L'effet est aujourd'hui limité : aucune politique de la base ne dépend du rôle, et l'onglet « Administration » n'offre aucune action. Le problème deviendrait sérieux le jour où une fonction d'administration réelle serait ajoutée.

Correction : stocker le rôle dans `app_metadata`, modifiable uniquement avec les droits d'administration du projet, puis adapter `is_super_admin()` (lire `auth.jwt() -> 'app_metadata'`), `AuthContext.tsx` et le script `assign_super_admin.sql` (colonne `raw_app_meta_data`). **À faire avant de développer la moindre fonction d'administration.**

### 3. Les photos sont publiques — priorité moyenne, selon la sensibilité des images

L'espace de stockage `survey-photos` est public : une photo est visible par toute personne qui en possède l'adresse, sans connexion, et une adresse transmise ou divulguée reste valable indéfiniment.

De plus, la politique `survey_photos_select_public` accorde la lecture de la table des fichiers à tout le monde, visiteurs non connectés compris. Avec la seule clé publique, il est donc possible de **lister** les fichiers de l'espace, et pas seulement d'afficher une photo dont on connaît déjà l'adresse.

Mesure rapide : un espace public sert ses fichiers par leur adresse sans qu'aucune politique de lecture soit nécessaire. Supprimer `survey_photos_select_public` (la politique `storage_select_for_authenticated` continue de couvrir les utilisateurs connectés) devrait fermer le listage anonyme sans rien changer à l'affichage. À valider sur un projet de test avant la production : affichage des photos, export PDF, suppression définitive d'un site.

Au-delà, si les photos de sites clients sont considérées comme confidentielles, il faut rendre l'espace privé et servir les images par des adresses signées à durée limitée. C'est un chantier réel : l'application enregistre aujourd'hui l'adresse publique dans chaque fiche et s'en sert pour l'affichage et pour les PDF (`surveyPhotoPipeline.ts`, `embedPhoto.ts`), et les fiches existantes devraient être migrées.

### 4. Aucune trace des modifications — priorité moyenne

Tout utilisateur peut modifier ou mettre à la corbeille n'importe quelle fiche, et la base ne garde que la date de dernière modification, pas son auteur ni l'ancienne valeur. En cas d'erreur ou de litige, il est impossible de savoir qui a changé quoi. Une table d'historique alimentée par un déclencheur sur `sites` et `surveys` comblerait ce manque.

La corbeille (suppression réversible) limite le risque de perte, mais la suppression définitive depuis la corbeille est irréversible.

### 5. La demande de suppression de compte n'est pas traitée — priorité moyenne (RGPD)

Le bouton de suppression de compte, dans les paramètres, inscrit seulement deux dates dans les métadonnées du compte et déconnecte l'utilisateur. Rien ne supprime ensuite le compte : il reste actif et l'utilisateur peut se reconnecter. Le seul effet est sa disparition des listes de prélèveurs une fois le délai de 30 jours écoulé.

Tant qu'un traitement automatique n'existe pas, ces demandes doivent être traitées à la main. Pour les repérer :

```sql
select id, email, raw_user_meta_data->>'deletion_requested' as demande
from auth.users
where raw_user_meta_data->>'deletion_requested' is not null;
```

La suppression d'un compte est refusée par la base tant qu'il est l'auteur de sites ou de fiches : il faut d'abord réattribuer ces lignes à un autre compte.

### 6. Un élément fictif dans l'onglet « Sécurité » — priorité basse

L'onglet « Sécurité » des paramètres affiche une liste d'« appareils connectés » qui contient une seule ligne écrite en dur dans le code (`Settings.tsx`, variable `devices` : « Chrome - Windows, Paris, France »). Elle ne reflète rien de réel et peut induire un utilisateur en erreur. À retirer, ou à remplacer par une vraie liste des sessions.

### 7. Fonctions SQL à durcir — priorité basse

`get_all_users`, `get_user_names` et `is_super_admin` sont déclarées `SECURITY DEFINER` sans fixer le chemin de recherche des schémas. La bonne pratique, signalée par les conseils de sécurité de Supabase, est d'ajouter `SET search_path = ''` à leur définition et de préfixer tous les objets par leur schéma.

`get_all_users` renvoie à tout utilisateur connecté la liste des noms de tous les comptes, et l'adresse email à la place du nom pour un compte qui n'en a pas.

### 8. Politique de contenu permissive pour les scripts — priorité basse

L'en-tête `Content-Security-Policy` autorise `'unsafe-inline'` et `'unsafe-eval'` dans `script-src`. Elle limite bien les domaines contactés, mais protège peu contre l'injection de script. L'application n'utilise pas `dangerouslySetInnerHTML` et React échappe les textes affichés, ce qui réduit l'exposition. Retirer ces deux mots-clés demande de vérifier qu'aucune bibliothèque n'en dépend.

### 9. Dépendances — à suivre

`npm audit` signale des avis de sécurité sur plusieurs dépendances, dont une partie ne concerne que les outils de développement. Ils n'ont pas été triés. Procéder par mises à jour ciblées, en relançant `npm run build` et un essai complet après chacune ; éviter `npm audit fix --force`, qui applique des changements de version majeure.

## Ce qui est en place

- RLS activée sur les deux tables ; aucun accès sans session.
- Clé `service_role` absente du code et des variables d'environnement.
- Identifiants Supabase lus exclusivement dans les variables d'environnement, application bloquée au démarrage s'ils manquent.
- Validation de tous les formulaires par schéma Zod.
- En-têtes HTTP de sécurité sur le site (HTTPS forcé, affichage en cadre interdit, domaines autorisés listés).
- Session conservée 30 jours au plus avec « Se souvenir de moi », limitée à l'onglet sinon.
- Stockage des photos limité aux formats image et à 10 Mo par fichier.
- Aucun secret dans le dépôt : `.env*` est exclu par `.gitignore`, seul `.env.example` est versionné.

## En cas d'incident

| Situation | Action |
| --- | --- |
| Compte compromis ou collaborateur parti | Supabase, **Authentication > Users** : bannir ou supprimer le compte. Le retirer aussi de `src/lib/constants/allowedFieldUsers.ts` |
| Compte inconnu dans la liste des utilisateurs | Le bannir, puis traiter le point 1 |
| Clé `anon` à renouveler | Supabase, réglages des clés d'API. Mettre à jour la variable dans Netlify, redéployer, reconstruire l'application Android. Les sessions ouvertes devront se reconnecter |
| Fiche ou site supprimé par erreur | Paramètres > Corbeille > Restaurer. Après suppression définitive : restauration depuis une sauvegarde Supabase uniquement |
| Données modifiées à tort en masse | Restauration de la base à une date antérieure (selon l'offre Supabase). Les photos ne sont pas couvertes par cette restauration |
