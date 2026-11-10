import { z } from 'zod';

export const SiteVisitQuestionnaireSchema = z.object({
  nom_visite: z.string().min(1, 'Le nom de la visite est obligatoire'),
  date: z.string().optional(),
  personne_contact_sur_site: z.string().optional(),
  
  historique_activites: z.object({
    activite_actuelle: z.string().optional(),
    activites_anterieures: z.string().optional(),
    incidents_connus: z.string().optional(),
  }),
  
  observations_visuelles: z.object({
    sols_taches: z.boolean().default(false),
    odeurs: z.boolean().default(false),
    vegetation_impactee: z.boolean().default(false),
    presence_dechets: z.boolean().default(false),
    presence_remblais: z.boolean().default(false),
    autres_observations: z.string().optional(),
  }),
  
  stockages: z.object({
    cuves_aeriennes: z.boolean().default(false),
    cuves_enterrees: z.boolean().default(false),
    fut_conteneurs: z.boolean().default(false),
    stockage_produits_chimiques: z.boolean().default(false),
    details_stockages: z.string().optional(),
  }),
  
  reseaux_et_ouvrages: z.object({
    presence_puits: z.boolean().default(false),
    presence_piezometres: z.boolean().default(false),
    reseaux_enterres_visibles: z.boolean().default(false),
    details_ouvrages: z.string().optional(),
  }),
  
  environnement_proche: z.object({
    voisinage_immediat: z.string().optional(),
    contexte_hydrogeologique: z.string().optional(),
  }),
  
  documents_consultes: z.object({
    plans_site: z.boolean().default(false),
    fiches_donnees_securite: z.boolean().default(false),
    rapports_anterieurs: z.boolean().default(false),
  }),
});

export type SiteVisitQuestionnaire = z.infer<typeof SiteVisitQuestionnaireSchema>;
