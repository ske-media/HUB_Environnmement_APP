import { z } from 'zod';

export const GardenQuestionnaireSchema = z.object({
  adresse_jardin: z.string().min(1, 'L\'adresse du jardin est obligatoire'),
  date_enquete: z.string().optional(),
  nom_enqueteur: z.string().optional(),
  
  occupants: z.object({
    nombre_adultes: z.number().min(0, 'Le nombre d\'adultes doit être positif'),
    nombre_enfants: z.number().min(0, 'Le nombre d\'enfants doit être positif'),
    animaux_domestiques: z.boolean()
  }),
  
  usage_jardin: z.object({
    presence_potager: z.boolean(),
    types_legumes_cultives: z.string().optional(),
    utilisation_compost: z.boolean(),
    presence_jeux_enfants: z.boolean(),
    presence_piscine: z.boolean()
  }),
  
  gestion_eau: z.object({
    source_arrosage: z.enum(['Robinet', 'Puits', 'Récupération pluie']),
    details_puits: z.string().optional()
  }),
  
  historique_parcelle: z.object({
    connaissance_usage_anterieur: z.string().optional(),
    apport_terres_exterieures: z.boolean(),
    details_apport_terres: z.string().optional()
  }),
  
  observations_generales: z.string().optional()
});

export type GardenQuestionnaire = z.infer<typeof GardenQuestionnaireSchema>;
