# 04 — Fiches et export PDF

## État des types de fiches

Le code contient 16 types de fiches. **Quatre sont en service.** Les douze autres ne sont proposés nulle part dans l'interface.

| Type (`surveys.type`) | Libellé | En service | Modèle PDF |
| --- | --- | --- | --- |
| `gas` | Gaz du sol | Oui | Valide, 114 champs |
| `soil` | Sondage sol | Oui | Valide, 6 variantes (voir plus bas) |
| `groundwater` | Eau souterraine | Oui | Valide, 88 champs |
| `pid` | Campagne PID | Oui | Valide, 193 champs |
| `excavation` | Suivi de fouille | Non | Valide, 48 champs |
| `ambient_air` | Air ambiant | Non | **Fichier factice** |
| `surface_water` | Eau superficielle | Non | **Fichier factice** |
| `piezometric` | Fiche piézométrique | Non | **Fichier factice** |
| `tap_water` | Eau du robinet | Non | **Fichier factice** |
| `sediment` | Sédiments | Non | **Fichier factice** |
| `risk_analysis` | Analyse des risques | Non | **Fichier factice** |
| `radon_soil` | Radon sol | Non | **Fichier factice** |
| `site_visit` | Questionnaire de visite | Non | **Fichier factice** |
| `equipment_tracking` | Suivi matériel | Non | **Fichier factice** |
| `garden_questionnaire` | Questionnaire jardin | Non | **Fichier factice** |
| `icpe_visit` | Visite ICPE | Non | **Fichier factice** |

« Fichier factice » : le fichier présent dans `public/pdf-templates/` pèse 690 octets et n'est pas un PDF lisible. L'export de ces types échouerait. Il faut obtenir de HUB Environnement le modèle officiel, avec ses champs de formulaire, avant d'envisager leur mise en service.

Les formulaires des types hors service sont par ailleurs **inachevés** : ils affichent une bannière « en développement » et la majorité des erreurs de typage du projet s'y trouvent (voir [08 — Passation](08-passation.md)). Les considérer comme des ébauches à reprendre, pas comme des fonctions prêtes à activer.

### Ce qui détermine qu'un type est en service

Une seule liste, dans `src/lib/surveyTypes.ts` :

```ts
export const ENABLED_SURVEY_TYPES = ['gas', 'soil', 'groundwater', 'pid'] as const;
```

Elle filtre le choix du type à la création, la liste des fiches d'un site, les filtres, l'activité récente et la corbeille. Les routes des autres types existent dans `App.tsx` mais aucun lien n'y mène. La liste `DEVELOPMENT_SURVEY_IDS` de `src/lib/developmentSurveys.ts` ne sert qu'à signaler visuellement un type en cours de développement s'il venait à être affiché.

Attention : la fonction SQL `get_dashboard_summary` contient la même liste de quatre types, en dur (voir [03 — Base de données](03-base-de-donnees.md)).

## Anatomie d'une fiche

Chaque type repose sur quatre éléments qui doivent rester cohérents entre eux.

| Élément | Emplacement | Rôle |
| --- | --- | --- |
| Schéma | `src/schema/<type>Schema.ts` | Structure des données, règles de validation, type TypeScript |
| Formulaire | `src/pages/surveys/<Type>Form.tsx` | Écran de saisie |
| Modèle PDF | `public/pdf-templates/<type>-…-template.pdf` | Document officiel avec champs de formulaire (AcroForm) |
| Configuration PDF | entrée dans `SURVEY_PDF_CONFIG`, `src/lib/pdf-generators/generatePdfDocument.ts` | Quel modèle utiliser, traitements particuliers |

Le lien entre le formulaire et le PDF se fait **par les noms** : la valeur saisie dans le champ `purge.materiel` du formulaire est écrite dans le champ du PDF qui porte ce nom. C'est pourquoi les noms des champs des schémas sont en français et reprennent ceux des modèles.

Les quatre formulaires en service partagent la même mécanique : préremplissage depuis le site (`useSiteDataForSurvey`), identifiant stable (`useSurveyDraftId`), confirmation avant de quitter (`useNavigationBlocker`), enregistrement résistant à la perte de réseau (`submitSurveyUpsert`). Les fiches gaz, sol et eau souterraine gèrent en plus des photos (`useSurveyPhotoField`), et la fiche sol un brouillon automatique (`useFormDraft`). Le formulaire PID (`PIDSurveyForm.tsx`) est le plus court et le plus simple à lire pour comprendre cette mécanique ; `GasSurveyForm.tsx` est le plus complet.

## Génération d'un PDF

Tout se passe dans le navigateur, dans `src/lib/pdf-generators/`.

| Fichier | Rôle |
| --- | --- |
| `generatePdfDocument.ts` | Point d'entrée : table des modèles, cas particuliers par type |
| `pdfDownload.ts` | Chaîne standard : charger le modèle, remplir, figer, nommer le fichier, déclencher le téléchargement |
| `fillGenericAcroform.ts` | Associe chaque champ du PDF à une donnée de la fiche |
| `pdfFieldAliases.ts` | Corrections de valeurs propres à une fiche avant remplissage |
| `pdfRadioMatching.ts` | Correspondance entre une valeur et une option de bouton radio (Oui/Non, vrai/faux, libellés) |
| `embedPhoto.ts` | Insertion d'une photo dans la zone d'un champ, orientation et proportions respectées |
| `buildPdfFilename.ts` | Nom du fichier produit |
| `exportSurveys.ts` | Export de plusieurs fiches : PDF fusionné ou archive ZIP |

### Déroulement

1. Le modèle est chargé depuis `/pdf-templates/…` (servi par le site, disponible hors-ligne grâce au cache de la PWA).
2. Les données de la fiche sont mises à plat : `{ purge: { materiel: 'Pompe' } }` devient `{ 'purge.materiel': 'Pompe' }` (`lib/utils/flattenObject.ts`). Les éléments de liste sont numérotés : `observations.0.profondeur`.
3. Pour chaque champ du PDF, `fillGenericAcroform` cherche la donnée correspondante en quatre essais successifs, du plus strict au plus souple :
   1. nom identique ;
   2. même dernier segment (`materiel` pour `purge.materiel`) ;
   3. nom identique après normalisation (sans accents, sans majuscules, sans ponctuation) ;
   4. l'un des deux noms normalisés contient l'autre.
4. La valeur est écrite selon le type du champ : texte (un booléen devient « OUI » ou « NON »), case à cocher, bouton radio.
5. Les photos sont dessinées à l'emplacement des champs prévus pour elles.
6. Le formulaire est figé (`flatten`) : le PDF produit n'est plus modifiable.

Le quatrième essai est le point fragile : il peut associer deux champs qui ne se correspondent pas si leurs noms se ressemblent. **La règle à suivre est de donner au champ du PDF exactement le chemin du champ du schéma**, pour que la correspondance se fasse dès le premier essai.

En développement, la console du navigateur affiche à chaque export la liste des champs remplis et des champs laissés vides, avec la donnée retenue pour chacun.

### Cas particuliers

- **Sondage sol.** Six modèles, `soil-survey-form-template-1.pdf` à `-6.pdf` : le modèle est choisi selon le nombre de lignes d'observation de la fiche (de 1 à 6 ; au-delà, le modèle 6 est utilisé et les lignes supplémentaires ne figurent pas dans le PDF). Le chef de projet, l'entreprise de forage et la commune sont relus sur le site au moment de l'export.
- **Gaz du sol.** Le type de conditionnement est forcé à la valeur fixe définie dans le schéma (`GAS_TYPE_CONDITIONNEMENT`), et la photo du point de prélèvement est insérée à part.
- **Eau souterraine.** Quelques champs du modèle portent des noms qui ne suivent pas la convention (cases « eau claire », « Alcool », « Autre nettoyant », champ texte des substances). Ils sont remplis explicitement par `applyGroundwaterLegacyMappings`. D'autres écarts de valeur sont corrigés dans `pdfFieldAliases.ts`.

### Nom des fichiers

`Fiche_<Type>_<Commune>_<Point>_<Date>.pdf`, par exemple `Fiche_Gaz_Sol_Lyon_PG3_2026-03-12.pdf`. Les accents et les caractères interdits dans un nom de fichier sont retirés. Les libellés de type sont dans `SURVEY_TYPE_LABELS` (`buildPdfFilename.ts`).

### Export de plusieurs fiches

Depuis la liste des fiches d'un site, une sélection multiple propose deux formats (`ExportSelectionDialog`, `exportSurveys.ts`) : un PDF unique réunissant toutes les fiches, ou une archive ZIP contenant un PDF par fiche, rangés dans un sous-dossier par type.

## Contrôler la cohérence entre schémas et modèles

```bash
npm run check:pdf
```

Le script `scripts/checkPdfFieldAlignment.mjs` ouvre chaque modèle, liste ses champs et les compare aux champs du schéma. Il signale les champs du PDF qui ne correspondent à aucune donnée et écrit un rapport détaillé dans `scripts/pdf-field-audit-report.json` (fichier non versionné). Avec l'option `--strict`, il se termine en erreur si une incohérence est trouvée.

Résultat actuel sur les types en service :

| Type | Champs du PDF | Associés | Remarque |
| --- | --- | --- | --- |
| `gas` | 114 | 112 | « Autre étanchéité » et « Bâche de couverture » sans donnée correspondante |
| `soil` (modèle 1) | 63 | 63 | |
| `groundwater` | 88 | 83 | Les 5 restants sont ceux remplis par `applyGroundwaterLegacyMappings` ; le script les signale à tort |
| `pid` | 193 | 193 | |

Le script signale aussi deux « champs critiques absents » (`excavation` et `groundwater`) : ce sont des champs attendus par la liste `CRITICAL_FIELDS` du script qui n'existent pas sous ce nom dans les modèles.

Ce script lit les schémas comme du texte, sans les exécuter : il donne une indication, pas une preuve. La vérification qui fait foi reste d'exporter une fiche entièrement remplie et de relire le PDF.

## Modifier une fiche existante

**Ajouter un champ**

1. L'ajouter au schéma (`src/schema/…`), en le rendant facultatif pour que les fiches déjà enregistrées restent valides.
2. L'ajouter au formulaire.
3. Si le champ doit figurer sur le PDF : ouvrir le modèle dans un éditeur de formulaires PDF (Adobe Acrobat Pro, par exemple), créer le champ et lui donner pour nom le chemin exact du champ dans le schéma. Remplacer le fichier dans `public/pdf-templates/`.
4. Lancer `npm run check:pdf`, puis exporter une fiche de test.

**Remplacer un modèle PDF** (nouvelle version du document officiel)

Garder le même nom de fichier et les mêmes noms de champs. Lancer `npm run check:pdf` pour repérer les champs renommés ou disparus, puis exporter une fiche de test de chaque type concerné.

**Renommer ou supprimer un champ**

Les fiches déjà enregistrées gardent l'ancien nom dans `specific_data`. Soit le formulaire continue d'accepter l'ancien nom, soit une migration SQL met à jour les fiches existantes.

## Ajouter ou mettre en service un type de fiche

1. **Modèle PDF.** Obtenir le document officiel avec ses champs de formulaire, nommés selon les chemins du schéma. Le placer dans `public/pdf-templates/`.
2. **Schéma.** Créer ou compléter `src/schema/<type>Schema.ts`.
3. **Formulaire.** Créer ou reprendre `src/pages/surveys/<Type>Form.tsx` en partant de `PIDSurveyForm.tsx`. Retirer la bannière `DevelopmentBanner` une fois le formulaire terminé.
4. **Type de données.** Vérifier la présence du type dans l'union `Survey` de `src/types.ts`.
5. **Routes.** Vérifier les deux routes (création, modification) dans `src/App.tsx`.
6. **Configuration PDF.** Vérifier l'entrée dans `SURVEY_PDF_CONFIG` et le libellé dans `SURVEY_TYPE_LABELS`.
7. **Libellé et icône.** Vérifier l'entrée dans `SURVEY_TYPE_CONFIG` (`src/lib/surveyTypes.ts`) et dans la liste des types proposés à la création (`NewSurvey.tsx` et `SurveyTypeSelectionSheet.tsx`).
8. **Audit.** Ajouter le type à la liste `SURVEY_TYPES` du script d'audit s'il n'y figure pas, puis lancer `npm run check:pdf`.
9. **Mise en service.** Ajouter le type à `ENABLED_SURVEY_TYPES` et le retirer de `DEVELOPMENT_SURVEY_IDS`.
10. **Tableau de bord.** Écrire une migration qui ajoute le type à la liste de `get_dashboard_summary`.
11. **Base de données.** Pour un type entièrement nouveau, écrire une migration `ALTER TYPE public.survey_type ADD VALUE '<type>'`. Les seize types actuels y sont déjà.
12. **Essai complet.** Créer une fiche, la modifier, l'enregistrer hors-ligne, l'exporter, relire le PDF.
