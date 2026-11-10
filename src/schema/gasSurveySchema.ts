import { z } from 'zod';

/** Valeur fixe inscrite sur la fiche PDF « Type de conditionnement ». */
export const GAS_TYPE_CONDITIONNEMENT = 'Glacière 4°C';

// Schéma principal pour la Fiche de Prélèvement des Gaz du Sol
export const GasSurveySchema = z.object({
  // En-tête
  // Ces champs sont remplis automatiquement depuis les données du site
  numero_affaire: z.string().optional(),
  client: z.string().optional(),
  commune: z.string().optional(),
  nom_prelevement: z.string().optional(),
  date: z.string().optional(),
  preleveur: z.string().optional(),
  localisation: z.string().optional(),
  longitude: z.string().optional(),
  latitude: z.string().optional(),
  altitude: z.string().optional(),
  visualisation_point_prelevement: z.string().optional(), // URL ou base64 de l'image

  // Section "Description des conditions environnementales"
  pid_ambiant_ppm: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? undefined : num;
    },
    z.number().nonnegative().optional()
  ),
  nature_revetement: z.enum(['Béton', 'Enrobé', 'Autre']).optional(),
  nature_revetement_autre: z.string().optional(), // Précision si "Autre" est sélectionné
  etat_revetement: z.enum(['Bon', 'Mauvais', 'Absent']).optional(),
  humidite_sol_surface: z.string().optional(),
  profondeur_nappe_msol: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? undefined : num;
    },
    z.number().nonnegative().optional()
  ),
  nom_piezometre: z.string().optional(),
  
  meteo: z.enum(['Ensoleillé', 'Nuageux', 'Pluvieux']).optional(),
  
  date_dernieres_pluies: z.string().optional(),
  
  temperature_air_c: z.object({
    t0: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().optional()
    ),
    tfin: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().optional()
    ),
  }),
  
  pression_atmospherique_hpa: z.object({
    t0: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().optional()
    ),
    tfin: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().optional()
    ),
  }),
  
  pluie_durant_mesure: z.object({
    t0: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') {
          if (val === 'true' || val === 'True' || val === 'TRUE') return true;
          if (val === 'false' || val === 'False' || val === 'FALSE') return false;
        }
        return undefined;
      },
      z.boolean().optional()
    ),
    tfin: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') {
          if (val === 'true' || val === 'True' || val === 'TRUE') return true;
          if (val === 'false' || val === 'False' || val === 'FALSE') return false;
        }
        return undefined;
      },
      z.boolean().optional()
    ),
  }).optional(),
  
  humidite_air_pct: z.object({
    t0: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    tfin: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
  }),
  
  vent_kmh: z.object({
    t0: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    tfin: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
  }),
  
  // Section "Description de l'ouvrage" (trois objets distincts et optionnels)
  // Type d'ouvrage sélectionné (un seul des trois peut être rempli)
  type_ouvrage: z.enum(['piezair', 'sous_dalle', 'canne_gaz']).optional(),
  
  ouvrage_piezair: z.object({
    bouchon_etanche: z.boolean(),
    profondeur_m: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    diametre_tubage_interne_mm: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    volume_l: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    presence_eau_hauteur_cm: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    hauteur_cm: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
  }).optional(),

  ouvrage_sous_dalle: z.object({
    type: z.enum(['temporaire', 'permanent']),
    epaisseur_dalle_m: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    profondeur_foration_m: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    diametre_foration_mm: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    volume_vide_cree_l: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    presence_vide_sous_dalle: z.boolean(),
    etancheite: z.string().optional(),
  }).optional(),

  ouvrage_canne_gaz: z.object({
    type: z.enum(['crepinee', 'perdue', 'retractable']),
    profondeur_m: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    profondeur_crepine_m: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    diametre_mm: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    volume_l: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
  }).optional(),

  // Section "Mise en place du prélèvement"
  etancheite_test: z.object({
    realise: z.boolean(),
    resultat_o2: z.string().optional(),
  }),

  etancheification_sol: z.object({
    realise: z.boolean(),
    type: z.enum(['Bâche', 'Autre']).optional(),
    bache_couverture_superficie_m2: z.preprocess(
      (val) => val === undefined || val === null ? undefined : String(val),
      z.string().optional()
    ),
    autre_details: z.string().optional(),
  }),

  echantillonnage_type: z.enum(['Actif', 'Passif']),

  echantillonnage_details: z.enum(['Tube adsorption avec pompage', 'Autre']),

  echantillonnage_details_autre: z.string().optional(),

  nature_supports: z.object({
    charbon_actif: z.boolean(),
    xad2: z.boolean(),
    fluorisil: z.boolean(),
    carulite: z.boolean(),
    presence_autre: z.boolean().optional(),
    autre: z.string().optional(),
  }),

  methode_plusieurs_supports: z.enum(['une pompe par support', 'dispositif de répartition des flux']),

  details_repartition_flux: z.string().optional(),

  montage: z.object({
    pompe_gilair: z.boolean(),
    debitmetre_gocal: z.boolean(),
    filtre_humidite: z.boolean(),
    filtre_poussieres: z.boolean(),
    presence_flexibles: z.boolean().optional(),
    flexible_pehd: z.boolean().optional(),
    flexible_ptfe: z.boolean().optional(),
    flexible_pp: z.boolean().optional(),
    presence_autre: z.boolean().optional(),
    autre: z.string().optional(),
  }),

  identification_blanc: z.object({
    type: z.enum(['Terrain', 'Transport']),
    nom: z.string().optional(),
  }),

  // Tableau "Purge de l'ouvrage" (une seule ligne de saisie)
  purge_ouvrage: z.object({
    heure_debut: z.string().optional(),
    debit_purge_lmin: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    duree_purge_min: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    volume_purge_l: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    pid_ppmv: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    t0: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    t1: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    t2: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    tfin_stabilise: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
  }),

  // Tableau "Prélèvement" (tableau dynamique avec useFieldArray)
  prelevements: z.array(z.object({
    support: z.string().optional(),
    heure_debut: z.string().optional(),
    heure_fin: z.string().optional(),
    debit_t0: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    debit_t1: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    debit_t2: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    debit_retenu: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    condensation_observee: z.boolean().optional(),
    condensation_observee_details: z.string().optional(), // Texte libre si condensation observée
    duree_prelevement_min: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
    volume_preleve_l: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      },
      z.number().nonnegative().optional()
    ),
  })).optional(),

  // Section "Conditionnement et transport" (regroupé dans un objet)
  conditionnement_transport: z.object({
    type_conditionnement: z.string().optional(),
    laboratoire: z.enum(['ALS France', 'Eurofins', 'Agrolab']).optional(),
    date_depot: z.string().optional(),
    transporteur: z.enum(['UPS', 'Navette', 'Autre']).optional(),
    transporteur_autre: z.string().optional(),
    date_envoi: z.string().optional(),
  }),
  
  substances_recherchees: z.object({
    tph_c5_c16_btex_cohv_naphtalene: z.boolean(),
    mercure_volatil: z.boolean(),
    pcb: z.boolean(),
    hap: z.boolean(),
    presence_autre: z.boolean().optional(),
    autre: z.string().optional(),
  }),
}).refine(
  (data) => {
    // Si "Autre" est sélectionné pour nature_revetement, nature_revetement_autre doit être renseigné
    if (data.nature_revetement === 'Autre') {
      return data.nature_revetement_autre !== undefined && data.nature_revetement_autre.trim() !== '';
    }
    return true;
  },
  {
    message: "Veuillez préciser la nature du revêtement",
    path: ['nature_revetement_autre'],
  }
);

// Génération automatique du type TypeScript à partir du schéma
export type GasSurveyFormData = z.infer<typeof GasSurveySchema>;