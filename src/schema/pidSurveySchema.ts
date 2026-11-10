import { z } from 'zod';

// Schéma pour une seule ligne de mesure dans le tableau
export const MeasurementSchema = z.object({
  location: z.string().min(1, "La localisation est requise."),
  pid: z.coerce.number().optional(),
  o2: z.coerce.number().optional(),
  h2s: z.coerce.number().optional(),
  ch4: z.coerce.number().optional(),
  co: z.coerce.number().optional(),
  remarque: z.string().optional(),
});

// Schéma principal pour le formulaire de Campagne PID
export const PIDSurveySchema = z.object({
  date: z.string().min(1, "La date est requise."),
  
  // En-tête : informations générales
  numero_affaire: z.string().min(1, "Le numéro d'affaire est requis."),
  client: z.string().min(1, "Le client est requis."),
  commune: z.string().min(1, "La commune est requise."),
  preleveur: z.string().min(1, "Le préleveur est requis."),

  weatherConditions: z.object({
    description: z.enum(['Ensoleillé', 'Nuageux', 'Pluvieux']).optional(),
    externalTemp: z.coerce.number().optional(),
    internalTemp: z.coerce.number().optional(),
    pressure: z.coerce.number().optional(),
    humidity: z.coerce.number().optional(),
    windSpeedDirection: z.string().optional(),
  }).optional(),

  // C'est un tableau de mesures, et il doit contenir au moins une ligne.
  measurements: z.array(MeasurementSchema).min(1, { message: "Vous devez ajouter au moins une mesure." }),

});

// Génération automatique du type TypeScript
export type PIDSurveyFormData = z.infer<typeof PIDSurveySchema>;  