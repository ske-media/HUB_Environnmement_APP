import { z } from 'zod';

export const GroundwaterSurveySchema = z.object({
  // En-tête & Localisation
  nom_ouvrage: z.string().min(1, "Le nom de l'ouvrage est obligatoire."),
  // Ces champs sont pré-remplis depuis le site parent et masqués dans l'UI.
  // Ils ne doivent donc pas bloquer l'enregistrement si la donnée site est absente.
  numero_affaire: z.string().optional(),
  client: z.string().optional(),
  commune: z.string().optional(),
  preleveur: z.string().min(1, "Le préleveur est obligatoire."),
  
  coordonnees: z.object({
    latitude: z.preprocess(
      (val) => val === '' || val === null || val === undefined ? undefined : Number(val),
      z.number().optional()
    ),
    longitude: z.preprocess(
      (val) => val === '' || val === null || val === undefined ? undefined : Number(val),
      z.number().optional()
    ),
    altitude: z.preprocess(
      (val) => val === '' || val === null || val === undefined ? undefined : Number(val),
      z.number().optional()
    ),
  }),
  
  date: z.string().min(1, "La date est requise."),
  heure: z.string().min(1, "L'heure est requise."),
  temperature_air: z.coerce.number().optional(),
  date_dernieres_pluies: z.string().optional(),
  meteo: z.enum(['Ensoleillé', 'Nuageux', 'Venteux', 'Pluvieux']),
  periode_concernee: z.enum(['Hautes eaux', 'Basses eaux']),
  
  // Description du Piézomètre
  description_piezometre: z.object({
    etat: z.enum(['Bon', 'Dégradé', 'Hors d\'usage', 'Non trouvé']),
    type_ouvrage: z.string().optional(),
    usage: z.string().optional(),
    etat_tete: z.object({
      capot_protection: z.boolean(),
      type_capot: z.enum(['Hors-sol', 'Ras-de-sol']).optional(),
      margelle: z.boolean(),
      cadenas: z.boolean(),
      tubage: z.boolean(),
      type_tubage: z.enum(['PVC', 'PEHD', 'Autre']).optional(),
      type_tubage_autre: z.string().optional(),
    }),
    photographie_url: z.string().optional(),
  }),
  
  // Caractéristiques de l'ouvrage
  caracteristiques: z.object({
    diametre: z.enum(['52/60mm', '26/32mm', 'autre']).optional(),
    diametre_autre: z.coerce.number().positive().optional(),
    hauteur_capot_m: z.coerce.number().optional(),
    profondeur_totale_m: z.coerce.number().optional(),
    hauteur_crepine_m: z.coerce.number().optional(),
    niveau_eau_m: z.coerce.number().optional(),
    hauteur_colonne_eau_m: z.coerce.number().optional(), // Calculé
    volume_eau_l: z.coerce.number().optional(), // Calculé
    volume_3_l: z.coerce.number().optional(), // Calculé
  }),
  
  // Détection de composés
  detection_composes: z.object({
    pid_ouverture_ppm: z.coerce.number().optional(),
    presence_flottants_cm: z.coerce.number().optional(),
  }),
  
  // Purge
  purge: z.object({
    materiel: z.enum(['Bailer', 'Pompe immergée', 'Autre']),
    materiel_autre: z.string().optional(),
    materiaux_tuyaux: z.enum(['PVC', 'PEHD']),
    type: z.enum(['Statique', 'Dynamique']),
    debit_debut_l_min: z.coerce.number().optional(),
    debit_fin_l_min: z.coerce.number().optional(),
    debit_moyen_l_min: z.coerce.number().optional(),
    position_pompe_m: z.coerce.number().optional(),
    rabattement_m: z.coerce.number().optional(),
    traitement_eau: z.object({
      charbon_actif: z.boolean(),
      autre: z.boolean(),
      autre_details: z.string().optional(),
    }),
    volume_purge_l: z.coerce.number().optional(),
    exutoire_rejet: z.string().optional(),
  }),
  
  // Prélèvement
  echantillonnage: z.object({
    materiel: z.enum(['Bailer', 'Pompe immergée', 'Autre']),
    materiel_autre: z.string().optional(),
    date_prelevement: z.string().optional(),
    heure_debut: z.string().optional(),
    heure_fin: z.string().optional(),
    duree_minutes: z.coerce.number().optional(), // Calculé
    debit_l_min: z.coerce.number().optional(),
    position_pompe_m: z.coerce.number().optional(),
    niveau_prelevement_m: z.coerce.number().optional(),
    nettoyage_materiel: z.enum(['Eau claire', 'Alcool', 'Autre']),
    nettoyage_autre_details: z.string().optional(),
  }),
  
  // Paramètres Physico-chimiques (structure fixe)
  parametres: z.object({
    temperature: z.object({
      purge: z.string().optional(),
      prelevement: z.string().optional(),
    }),
    conductivite: z.object({
      purge: z.string().optional(),
      prelevement: z.string().optional(),
    }),
    ph: z.object({
      purge: z.string().optional(),
      prelevement: z.string().optional(),
    }),
    redox: z.object({
      purge: z.string().optional(),
      prelevement: z.string().optional(),
    }),
    turbidite: z.object({
      purge: z.string().optional(),
      prelevement: z.string().optional(),
    }),
    irisation: z.object({
      purge: z.string().optional(),
      prelevement: z.string().optional(),
    }),
    odeur: z.object({
      purge: z.string().optional(),
      prelevement: z.string().optional(),
    }),
    couleur: z.object({
      purge: z.string().optional(),
      prelevement: z.string().optional(),
    }),
    remarques: z.object({
      purge: z.string().optional(),
      prelevement: z.string().optional(),
    }),
    pid: z.object({
      purge: z.string().optional(),
      prelevement: z.string().optional(),
    }),
  }),
  
  // Conditionnement & Transport
  conditionnement: z.object({
    date_depot: z.string().optional(),
    date_envoi: z.string().optional(),
    type_conditionnement: z.enum(['Transparent (450mL)', 'Brun (350mL)']).optional(),
    laboratoire: z.enum(['ALS France', 'Eurofins', 'Agrolab']).optional(),
    transporteur: z.enum(['UPS', 'Navette', 'Autre']).optional(),
    transporteur_autre: z.string().optional(),
    substances: z.object({
      hct: z.boolean(),
      hap: z.boolean(),
      btex: z.boolean(),
      cohv: z.boolean(),
      pcb: z.boolean(),
      metaux: z.boolean(),
      pesticides: z.boolean(),
      pfas: z.boolean(),
      phenol: z.boolean(),
      autre: z.boolean(),
    }),
    substances_autre_details: z.string().optional(),
  }),
}).superRefine((data, ctx) => {
  // Garantit qu'un détail est renseigné quand "Autre" est sélectionné.
  const requireDetail = (
    condition: boolean,
    value: string | undefined,
    path: (string | number)[],
  ) => {
    if (condition && !(value && value.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Précisez la valeur lorsque "Autre" est sélectionné.',
        path,
      });
    }
  };

  requireDetail(
    data.purge?.materiel === 'Autre',
    data.purge?.materiel_autre,
    ['purge', 'materiel_autre'],
  );
  requireDetail(
    data.echantillonnage?.materiel === 'Autre',
    data.echantillonnage?.materiel_autre,
    ['echantillonnage', 'materiel_autre'],
  );
  requireDetail(
    data.echantillonnage?.nettoyage_materiel === 'Autre',
    data.echantillonnage?.nettoyage_autre_details,
    ['echantillonnage', 'nettoyage_autre_details'],
  );
  requireDetail(
    data.conditionnement?.transporteur === 'Autre',
    data.conditionnement?.transporteur_autre,
    ['conditionnement', 'transporteur_autre'],
  );
  requireDetail(
    data.caracteristiques?.diametre === 'autre',
    data.caracteristiques?.diametre_autre !== undefined
      ? String(data.caracteristiques.diametre_autre)
      : undefined,
    ['caracteristiques', 'diametre_autre'],
  );
});

export type GroundwaterSurveyFormData = z.infer<typeof GroundwaterSurveySchema>;