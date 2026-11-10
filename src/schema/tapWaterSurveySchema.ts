import { z } from 'zod';

export const TapWaterSurveySchema = z.object({
  nom_prelevement: z.string().min(1, 'Le nom du prélèvement est obligatoire'),
  date: z.string().optional(),
  heure: z.string().optional(),
  longitude: z.string().optional(),
  latitude: z.string().optional(),
  altitude: z.string().optional(),
  lieu_repere: z.string().optional(),
  meteo: z.string().optional(),
  operateur: z.string().optional(),
  /** URLs publiques des photos du point de prélèvement. */
  photos: z.array(z.string()).optional(),
  /** Champ historique conservé en lecture pour les fiches déjà enregistrées. */
  photographie_url: z.string().optional(),
  
  environnement: z.object({
    usage_batiment: z.string().optional(),
    derniere_utilisation: z.string().optional(),
    frequence_utilisation: z.enum(['Journalier', 'Hebdomadaire', 'Mensuel', 'Annuel']).optional(),
    population_concernee: z.object({
      enfants: z.boolean().optional(),
      adultes: z.boolean().optional(),
      employes: z.boolean().optional(),
      autres: z.boolean().optional(),
    }).optional(),
    nombre_personnes: z.enum(['<10', '>10', '>50', '>100']).optional(),
    observations: z.string().optional(),
  }).optional(),
  
  point_prelevement: z.object({
    age_batiment: z.string().optional(),
    temp_air: z.string().optional(),
    type_canalisation: z.enum(['Cuivre', 'Plomb', 'Multicouche', 'PVC', 'Autre']).optional(),
    type_canalisation_autre: z.string().optional(),
    travaux_canalisations: z.string().optional(),
    travaux_alentours: z.string().optional(),
    pid_ambiant: z.object({
      avant_purge: z.string().optional(),
      pendant_purge: z.string().optional(),
      apres_purge: z.string().optional(),
    }).optional(),
    observations: z.string().optional(),
  }).optional(),
  
  echantillonnage: z.object({
    purge_realisee: z.enum(['Oui (analyse eau qualité)', 'Non (analyse eau canalisation)']).optional(),
    duree_purge_max: z.string().optional(),
    duree_purge_moyen: z.string().optional(),
    volume_purge_estime: z.string().optional(),
  }).optional(),
  
  parametres: z.object({
    heure: z.object({
      en_cours_de_purge: z.string().optional(),
      prelevement: z.string().optional(),
    }).optional(),
    temp: z.object({
      en_cours_de_purge: z.string().optional(),
      prelevement: z.string().optional(),
    }).optional(),
    ph: z.object({
      en_cours_de_purge: z.string().optional(),
      prelevement: z.string().optional(),
    }).optional(),
    conductivite: z.object({
      en_cours_de_purge: z.string().optional(),
      prelevement: z.string().optional(),
    }).optional(),
    redox: z.object({
      en_cours_de_purge: z.string().optional(),
      prelevement: z.string().optional(),
    }).optional(),
    irisations: z.object({
      en_cours_de_purge: z.string().optional(),
      prelevement: z.string().optional(),
    }).optional(),
    odeur: z.object({
      en_cours_de_purge: z.string().optional(),
      prelevement: z.string().optional(),
    }).optional(),
    couleur: z.object({
      en_cours_de_purge: z.string().optional(),
      prelevement: z.string().optional(),
    }).optional(),
    matieres_suspension: z.object({
      en_cours_de_purge: z.string().optional(),
      prelevement: z.string().optional(),
    }).optional(),
    remarque: z.object({
      en_cours_de_purge: z.string().optional(),
      prelevement: z.string().optional(),
    }).optional(),
  }).optional(),
  
  pid: z.object({
    premier_jet: z.string().optional(),
    pendant: z.string().optional(),
  }).optional(),
  
  gestion_echantillons: z.object({
    conditionnement: z.string().optional(),
    date_envoi: z.string().optional(),
    nom_laboratoire: z.string().optional(),
    transporteur: z.string().optional(),
    substances_recherchees: z.string().optional(),
  }).optional(),
});

export type TapWaterSurvey = z.infer<typeof TapWaterSurveySchema>;
