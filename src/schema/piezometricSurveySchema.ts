import { z } from 'zod';

export const PiezometricSurveySchema = z.object({
  nom_ouvrage: z.string().min(1, "Le nom de l'ouvrage est obligatoire."),
  
  date_releve: z.string().min(1, "La date est requise."),
  heure_releve: z.string().min(1, "L'heure est requise."),
  
  meteo: z.string().optional(),

  coordonnees: z.object({
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    altitude: z.coerce.number().optional(),
  }).optional(),
  lieu_repere: z.string().optional(),
  
  point_de_repere: z.string().min(1, "Le point de repère est requis (ex: Haut du tubage)."),
  altitude_repere_mNGF: z.coerce.number().optional(),
  
  profondeur_eau_m: z.coerce.number().min(0, "La profondeur de l'eau doit être positive."),
  niveau_piezometrique_mNGF: z.coerce.number().optional(), // Sera calculé si possible
  
  presence_flottant: z.boolean(),
  epaisseur_flottant_mm: z.coerce.number().optional(),
  
  remarques: z.string().optional(),
});

export type PiezometricSurveyFormData = z.infer<typeof PiezometricSurveySchema>;