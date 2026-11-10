import { z } from 'zod';

export const SedimentSurveySchema = z.object({
  nom_prelevement: z.string().optional(),
  date: z.string().optional(),
  heure: z.string().optional(),
  longitude: z.string().optional(),
  latitude: z.string().optional(),
  altitude: z.string().optional(),
  meteo: z.string().optional(),
  meteo_jours_precedents: z.string().optional(),
  operateur: z.string().optional(),
  /** URLs publiques des photos du point de prélèvement. */
  photos: z.array(z.string()).optional(),
  /** Champ historique conservé en lecture pour les fiches déjà enregistrées. */
  photographie_url: z.string().optional(),
  
  station_prelevement: z.object({
    type_eau_superficielle: z.enum(['Fleuve', 'Cours d\'eau', 'Ruisseau', 'Lac', 'Etang', 'Bassin']).optional(),
    position_prelevement: z.enum(['Berge', 'Milieu du lit', 'Amont', 'Aval', 'Autre']).optional(),
  }).optional(),
  
  echantillonnage: z.object({
    materiel: z.enum(['Seau', 'Canne de prélèvement', 'Flacon']).optional(),
    position: z.enum(['Depuis la rive', 'A pied', 'Depuis un pont', 'Depuis une embarcation', 'Autre']).optional(),
    profondeur: z.string().optional(),
    remarques: z.string().optional(),
    type: z.enum(['Ponctuel', 'Composite', 'Autre']).optional(),
  }).optional(),
  
  lithologie: z.array(z.object({
    profondeur: z.string().optional(),
    lithologie: z.string().optional(),
    pid: z.string().optional(),
    organoleptiques: z.string().optional(),
    echantillon: z.string().optional(),
  })).min(1, 'Au moins une entrée de lithologie est requise'),
  
  parametres: z.object({
    ph: z.string().optional(),
    couleur: z.string().optional(),
    temp: z.string().optional(),
    pid: z.string().optional(),
    conductivite: z.string().optional(),
    irisation: z.string().optional(),
    redox: z.string().optional(),
    odeur: z.string().optional(),
    presence_organismes: z.string().optional(),
    remarques: z.string().optional(),
  }).optional(),
  
  gestion_echantillons: z.object({
    conditionnement: z.string().optional(),
    date_envoi: z.string().optional(),
    nom_laboratoire: z.string().optional(),
    transporteur: z.string().optional(),
    substances_recherchees: z.string().optional(),
  }).optional(),
});

export type SedimentSurvey = z.infer<typeof SedimentSurveySchema>;
