import { z } from 'zod';

export const RadonSoilSurveySchema = z.object({
  nom_point_mesure: z.string().min(1, 'Le nom du point de mesure est obligatoire'),
  date: z.string().optional(),
  heure: z.string().optional(),
  operateur: z.string().optional(),
  
  coordonnees: z.object({
    longitude: z.string().optional(),
    latitude: z.string().optional(),
    altitude: z.string().optional(),
  }).optional(),
  
  contexte_batiment: z.object({
    type_batiment: z.enum(['Maison', 'ERP', 'Bureau', 'Autre']),
    presence_sous_sol: z.boolean(),
    type_ventilation: z.string().optional(),
  }),
  
  conditions_meteo: z.object({
    pression_atmospherique_hpa: z.number().optional(),
    temperature_air_c: z.number().optional(),
    humidite_relative_pct: z.number().optional(),
    pluies_recentes: z.boolean().optional(),
  }),
  
  instrumentation: z.object({
    type_appareil: z.string().min(1, 'Le type d\'appareil est obligatoire'),
    numero_serie: z.string().min(1, 'Le numéro de série est obligatoire'),
    date_dernier_etalonnage: z.string().min(1, 'La date du dernier étalonnage est obligatoire'),
  }),
  
  methode_prelevement: z.object({
    type_prelevement: z.enum(['Actif', 'Passif']),
    profondeur_prelevement_m: z.number().min(0, 'La profondeur doit être positive'),
    duree_mesure_min: z.number().min(1, 'La durée de mesure doit être d\'au moins 1 minute'),
    debit_pompage_l_min: z.number().optional(),
  }).refine((data) => {
    // Si le type de prélèvement est "Actif", le débit de pompage est obligatoire
    if (data.type_prelevement === 'Actif' && !data.debit_pompage_l_min) {
      return false;
    }
    return true;
  }, {
    message: 'Le débit de pompage est obligatoire pour un prélèvement actif',
    path: ['debit_pompage_l_min'],
  }),
  
  resultats: z.object({
    concentration_radon_bq_m3: z.number().min(0, 'La concentration de radon doit être positive'),
    concentration_co2_pct: z.number().optional(),
    incertitude_mesure: z.number().optional(),
  }),
  
  observations: z.string().optional(),
});

export type RadonSoilSurvey = z.infer<typeof RadonSoilSurveySchema>;
