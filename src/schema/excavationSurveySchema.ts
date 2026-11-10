import { z } from 'zod';

// Schéma pour une ligne de prélèvement (7 colonnes du tableau)
const PrelevementSchema = z.object({
  point_prelevement: z.string().optional(),
  profondeur_prelevee: z.string().optional(),
  surface_prelevee: z.string().optional(),
  criteres_organoleptiques: z.string().optional(),
  mesure_pid: z.string().optional(),
  echantillon: z.string().optional(),
  coordonnees_xy: z.string().optional(),
});

export const ExcavationSurveySchema = z.object({
  // En-tête
  nom_projet: z.string().optional(),
  client: z.string().optional(),
  site_commune: z.string().optional(),
  responsable_projet: z.string().optional(),
  operateur: z.string().optional(),
  date_heure: z.string().optional(),
  meteo: z.string().optional(),
  zone_source: z.string().optional(),
  coordonnees: z.object({
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    altitude: z.coerce.number().optional(),
  }).optional(),
  lieu_repere: z.string().optional(),
  
  // Tableau de prélèvements (exactement 5 lignes)
  prelevements: z.array(PrelevementSchema).length(5, "Exactement 5 prélèvements sont requis"),
  
  // Gestion des échantillons (objet simple, non tableau)
  gestion_echantillons: z.object({
    flaconnage: z.string().optional(),
    date_heure_expedition: z.string().optional(),
    laboratoire: z.string().optional(),
    conditionnement: z.string().optional(),
    substances_recherchees: z.string().optional(),
  }),

  // Plan de localisation
  localisation_prelevements_plan: z.string().optional(),
});

export type ExcavationSurveyFormData = z.infer<typeof ExcavationSurveySchema>;
