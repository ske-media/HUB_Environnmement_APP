# 03 — Base de données

La base est un PostgreSQL hébergé par Supabase. Son schéma complet est décrit par les fichiers de `supabase/migrations/`.

> **Limite de ce document.** Il décrit le schéma tel que le produisent les migrations de ce dépôt, rejouées sur une base vide. Il n'a pas été comparé à la base de production. Avant toute intervention sur celle-ci, faire la comparaison décrite à la section « Vérifier l'alignement avec la production ».

## Tables

### `sites`

Un dossier d'affaire.

| Colonne | Type | Remarque |
| --- | --- | --- |
| `id` | uuid | Clé primaire. Peut être fournie par l'application (création hors-ligne) |
| `user_id` | uuid | Créateur, référence `auth.users`. Suppression du compte refusée tant qu'il possède des sites |
| `created_at`, `updated_at` | timestamptz | `updated_at` est mis à jour par un déclencheur |
| `name` | text, obligatoire | Nom du client |
| `project_number` | text, obligatoire | Numéro d'affaire |
| `location` | text | Adresse |
| `city` | text | Commune |
| `coordinates` | jsonb | `{ "latitude": 48.85, "longitude": 2.35 }` |
| `project_manager` | text | Chef de projet (libellé « NOM Prénom », pas un identifiant) |
| `engineer_in_charge` | text | Opérateur (texte libre) |
| `drilling_company` | text | Entreprise de forage |
| `status` | enum `site_status` | `active` ou `archived` |
| `deleted_at` | timestamptz | Renseigné = site dans la corbeille |

### `surveys`

Une fiche de terrain.

| Colonne | Type | Remarque |
| --- | --- | --- |
| `id` | uuid | Clé primaire, **générée par l'application** à l'ouverture du formulaire |
| `site_id` | uuid | Référence `sites`. La suppression définitive d'un site supprime ses fiches |
| `created_by` | uuid | Auteur, référence `auth.users` |
| `created_at`, `updated_at` | timestamptz | |
| `type` | enum `survey_type` | Type de fiche, voir ci-dessous |
| `name` | text | Nom personnalisé. S'il est vide, l'interface affiche le libellé du type |
| `specific_data` | jsonb, obligatoire | Tout le contenu de la fiche |
| `deleted_at` | timestamptz | Renseigné = fiche dans la corbeille |

**`specific_data`** contient les valeurs du formulaire telles quelles. Sa structure dépend du type de fiche et n'est pas contrôlée par la base : elle est définie et validée par le schéma Zod correspondant dans `src/schema/`. Les photos y figurent sous forme d'adresses publiques du stockage Supabase.

Conséquence pratique : ajouter un champ à une fiche ne demande aucune migration. En revanche, renommer ou supprimer un champ laisse les anciennes fiches avec l'ancienne structure ; il faut alors soit garder le formulaire tolérant, soit écrire une migration de données.

**Valeurs de `survey_type`** : `soil`, `groundwater`, `gas`, `ambient_air`, `surface_water`, `pid`, `piezometric`, `tap_water`, `sediment`, `excavation`, `risk_analysis`, `radon_soil`, `site_visit`, `equipment_tracking`, `garden_questionnaire`, `icpe_visit`.

### Index

Sur `sites` : `user_id`, `status`, `deleted_at` (lignes non supprimées). Sur `surveys` : `site_id`, `created_by`, `type`, `deleted_at` (lignes non supprimées), et un index GIN sur `specific_data`.

## Comptes utilisateurs

Les comptes sont gérés par Supabase Auth (table `auth.users`). Il n'y a pas de table de profils : les informations propres à l'application sont dans les métadonnées du compte (`raw_user_meta_data`).

| Métadonnée | Contenu |
| --- | --- |
| `first_name`, `last_name`, `full_name` | Renseignés à l'inscription |
| `role` | `user` par défaut, `super_admin` pour un administrateur |
| `deletion_requested`, `deletion_effective` | Dates posées quand l'utilisateur demande la suppression de son compte depuis les paramètres |

Ces métadonnées sont modifiables par l'utilisateur lui-même. Les conséquences sont traitées dans [07 — Sécurité](07-securite.md).

## Droits d'accès (RLS)

La sécurité au niveau des lignes est activée sur `sites` et `surveys`. Le modèle est **collaboratif** : tout utilisateur connecté voit et modifie tous les sites et toutes les fiches. Un visiteur non connecté n'accède à rien.

Droits effectifs d'un utilisateur connecté :

| Action | `sites` | `surveys` |
| --- | --- | --- |
| Lire | Tous, corbeille comprise | Toutes, corbeille comprise |
| Créer | Oui | Oui |
| Modifier, archiver, mettre à la corbeille, restaurer | Tous | Toutes |
| Supprimer définitivement | Seulement ceux qu'il a créés | Seulement celles qu'il a créées |

Plusieurs politiques coexistent sur chaque table parce que les migrations successives ont ajouté des règles sans retirer toutes les précédentes. PostgreSQL accorde l'accès dès qu'une politique l'autorise : ce sont donc les plus permissives qui s'appliquent, et les autres sont sans effet.

| Politique | Commande | Condition | Effet réel |
| --- | --- | --- | --- |
| `authenticated_users_can_view_all_sites` | SELECT | toujours vraie | Détermine la lecture |
| `sites_select_for_authenticated_users`, `sites_select_deleted_for_owner` | SELECT | plus restrictives | Sans effet |
| `authenticated_users_can_insert_sites` | INSERT | utilisateur connecté | Détermine la création |
| `sites_insert_for_user` | INSERT | `user_id` = utilisateur | Sans effet |
| `authenticated_users_can_update_all_sites` | UPDATE | toujours vraie | Détermine la modification |
| `authenticated_users_can_soft_delete_all_sites`, `sites_update_for_authenticated_users`, `sites_restore_for_owner` | UPDATE | plus restrictives | Sans effet |
| `sites_delete_for_owner`, `sites_permanent_delete_for_owner` | DELETE | `user_id` = utilisateur | Détermine la suppression définitive |

La table `surveys` porte le même jeu de politiques, avec `created_by` à la place de `user_id` et les préfixes `surveys_` ou `authenticated_users_can_…_surveys`.

Pour lister les politiques réellement en place sur une base :

```sql
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by tablename, cmd, policyname;
```

## Fonctions SQL

| Fonction | Appelée par | Rôle |
| --- | --- | --- |
| `get_all_users()` | `hooks/useUsers.ts` | Liste des utilisateurs actifs (identifiant, nom complet, prénom, nom). Exclut les comptes bannis et ceux dont la suppression demandée est arrivée à échéance |
| `get_user_names(uuid[])` | `pages/SiteSurveys.tsx` | Noms des auteurs d'une liste de fiches |
| `get_dashboard_summary(uuid)` | `hooks/useDashboardData.ts` | Chiffres du tableau de bord, 10 dernières fiches, points de la carte. Ne compte que les types `gas`, `soil`, `groundwater`, `pid` |
| `is_super_admin()` | aucune politique actuelle | Lit le rôle dans le jeton de session. Vestige du modèle par rôles, conservé |
| `handle_updated_at()` | déclencheurs | Met à jour `updated_at` |

`get_all_users` et `get_user_names` s'exécutent avec les droits de leur propriétaire (`SECURITY DEFINER`) : c'est ce qui leur permet de lire `auth.users`, inaccessible autrement. Elles ne renvoient que des noms, jamais d'adresse email, sauf pour un compte sans nom renseigné où l'email sert de libellé de secours.

`get_dashboard_summary` filtre les types de fiches en dur. Si un nouveau type est activé dans l'application, cette fonction doit être mise à jour par une migration pour qu'il apparaisse au tableau de bord.

## Stockage des photos

Un seul espace de stockage : `survey-photos`.

| Réglage | Valeur |
| --- | --- |
| Visibilité | **Public** : toute personne disposant de l'adresse d'une photo peut l'afficher |
| Taille maximale | 10 Mo par fichier (l'application compresse vers 1 Mo) |
| Formats acceptés | JPEG, PNG, WebP, HEIC, HEIF |
| Écriture, remplacement, suppression | Utilisateurs connectés (tout utilisateur, sur tout fichier) |

Chemin d'un fichier : `sites/<siteId>/<type de fiche>/<horodatage>-<champ>.<extension>`.

Le caractère public est un choix délibéré : l'application enregistre dans la fiche l'adresse publique de chaque photo, utilisée pour l'affichage et pour l'insertion dans les PDF. Les adresses ne sont pas protégées, et la politique `survey_photos_select_public` permet en plus à un visiteur non connecté de lister les fichiers. Voir [07 — Sécurité](07-securite.md), point 3.

Lorsqu'un site est supprimé définitivement depuis la corbeille, l'application supprime aussi ses photos (`deleteSiteStorage` dans `hooks/useSites.ts`).

## Migrations

| Fichier | Contenu |
| --- | --- |
| `0000_initial_schema.sql` | Types, tables, déclencheurs, premières politiques, stockage, index |
| `20251116090000_update_survey_type_enum.sql` | Garantit la présence de la valeur `excavation` |
| `20251117090000_add_deleted_at_to_tables.sql` | Corbeille : colonne `deleted_at` et politiques associées |
| `20251118000000_add_name_to_surveys.sql` | Nom personnalisé des fiches |
| `20251120000000_update_rls_for_roles.sql` | Fonction `is_super_admin`, politiques par rôle (retirées ensuite) |
| `20251121000000_add_get_user_names_function.sql` | Fonction `get_user_names` |
| `20251122000000_add_get_all_users_function.sql` | Fonction `get_all_users` |
| `20251123000000_update_get_all_users_filter_deleted.sql` | Exclusion des comptes bannis ou supprimés |
| `20260114001433_enable_collaborative_mode.sql` | Passage au modèle collaboratif |
| `20260423120000_add_last_name_to_user_rpcs.sql` | Prénom et nom dans les deux fonctions utilisateurs |
| `20260424015002_cleanup_accidental_dashboard_rpc.sql` | Sans effet, conservée pour l'historique |
| `20260424050846_get_dashboard_summary_rpc.sql` | Fonction du tableau de bord |
| `20260803120000_survey_photos_public_bucket.sql` | Stockage des photos rendu public |

### Deux corrections apportées pour la passation

L'historique d'origine ne pouvait pas être rejoué sur une base vide. Deux points ont été corrigés et la suite complète a été rejouée avec succès sur un PostgreSQL vide :

1. `20260423120000_add_last_name_to_user_rpcs.sql` modifiait le type de retour de deux fonctions par un simple `CREATE OR REPLACE`, ce que PostgreSQL refuse. Deux `DROP FUNCTION IF EXISTS` ont été ajoutés avant la recréation. Sur une base où la migration est déjà appliquée, cela ne change rien : la CLI ne rejoue pas une migration enregistrée.
2. Un fichier `9999_full_schema_baseline.sql` figurait dans les migrations. C'était un instantané partiel du schéma (sans le stockage, sans la fonction du tableau de bord, sans droit de création sur `sites`) qui entrait en conflit avec les migrations précédentes. Il a été retiré.

### Vérifier l'alignement avec la production

À faire une fois, avant le premier `db push` vers la production :

```bash
npx supabase link --project-ref <ref-du-projet-de-production>
npx supabase migration list
```

La commande affiche côte à côte les migrations du dépôt et celles enregistrées dans la base.

- Si les deux colonnes sont identiques : rien à faire.
- Si la base contient une version `9999` absente du dépôt : la déclarer comme retirée avec `npx supabase migration repair --status reverted 9999`.
- Si la base ne contient aucune migration enregistrée alors que les tables existent (schéma appliqué à la main dans l'éditeur SQL) : déclarer chaque migration du dépôt comme déjà appliquée avec `npx supabase migration repair --status applied <version>`, après avoir vérifié avec les requêtes de ce document que le schéma en place correspond bien.

Ne jamais lancer `db push` vers la production sans avoir fait cette comparaison.

### Faire évoluer le schéma

```bash
npx supabase migration new <nom_de_la_modification>
# écrire le SQL dans le fichier créé sous supabase/migrations/
npx supabase db reset          # rejoue tout en local pour vérifier (option B de l'installation)
npx supabase db push           # applique au projet lié
```

Règles à respecter :

- ne pas modifier une migration déjà appliquée en production, en créer une nouvelle ;
- écrire des migrations rejouables (`IF NOT EXISTS`, `DROP … IF EXISTS`) ;
- toute nouvelle table doit activer la RLS et définir ses politiques dans la même migration ;
- ajouter une valeur à `survey_type` se fait par `ALTER TYPE … ADD VALUE`, dans une migration qui ne fait que cela.

## Scripts SQL d'administration

Dans `supabase/scripts/`, à exécuter à la main dans l'éditeur SQL de Supabase :

| Script | Rôle |
| --- | --- |
| `assign_super_admin.sql` | Donner ou retirer le rôle `super_admin`, lister les comptes et leurs rôles |
| `test_get_all_users.sql` | Vérifier ce que renvoie `get_all_users` et quels comptes en sont exclus |

## Sauvegardes

Les sauvegardes dépendent de l'offre Supabase du projet (sauvegardes quotidiennes à partir de l'offre payante, aucune garantie sur l'offre gratuite). Vérifier le réglage dans le tableau de bord, menu **Database > Backups**, et prévoir un export régulier si l'offre n'en fournit pas. Les photos du stockage ne font pas partie des sauvegardes de la base.
