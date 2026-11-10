import { z } from 'zod';

// Schéma détaillé pour l'analyse de risques (3 pages du PDF)
export const RiskAnalysisSchema = z.object({
  // Page 1 - Prestations
  prestations: z.object({
    visite_site: z.boolean().optional(),
    sondages_sol: z.boolean().optional(),
    prelevements_sol: z.boolean().optional(),
    prelevements_eau: z.boolean().optional(),
    prelevements_air: z.boolean().optional(),
    analyses_laboratoire: z.boolean().optional(),
    etude_documentaire: z.boolean().optional(),
    autres: z.string().optional(),
  }),

  // Page 1 - Transport
  transport: z.object({
    distance_km: z.coerce.number().optional(),
    duree_estimee_heures: z.coerce.number().optional(),
    moyen_transport: z.enum(['Véhicule léger', 'Véhicule utilitaire', 'Camion', 'Autre']).optional(),
    conducteur: z.string().optional(),
    passagers: z.array(z.string()).optional(),
  }),

  // Page 2 - Risques terrain (tableau)
  risques_terrain: z.array(z.object({
    type_risque: z.string().optional(),
    description: z.string().optional(),
    probabilite: z.enum(['Faible', 'Modérée', 'Élevée']).optional(),
    gravite: z.enum(['Faible', 'Modérée', 'Élevée']).optional(),
    mesures_prevention: z.string().optional(),
    responsable: z.string().optional(),
  })),

  // Page 2 - Revêtements
  revetements: z.object({
    amiante: z.object({
      presence: z.boolean().optional(),
      localisation: z.string().optional(),
      etat: z.enum(['Bon', 'Dégradé', 'Très dégradé']).optional(),
      mesures: z.string().optional(),
    }),
    hap: z.object({
      presence: z.boolean().optional(),
      localisation: z.string().optional(),
      etat: z.enum(['Bon', 'Dégradé', 'Très dégradé']).optional(),
      mesures: z.string().optional(),
    }),
  }),

  // Page 3 - Composés suspectés (tableau)
  composes_suspectes: z.array(z.object({
    nom_compose: z.string().optional(),
    concentration_estimee: z.string().optional(),
    localisation: z.string().optional(),
    risque_sante: z.enum(['Faible', 'Modéré', 'Élevé']).optional(),
    mesures_protection: z.string().optional(),
  })),

  // Page 3 - Ouvrages enterrés
  ouvrages_enterres: z.object({
    reseaux_identifies: z.array(z.object({
      type_reseau: z.string().optional(),
      localisation: z.string().optional(),
      profondeur: z.string().optional(),
      etat: z.enum(['Bon', 'Dégradé', 'Inconnu']).optional(),
      precautions: z.string().optional(),
    })),
    actions_prealables: z.array(z.object({
      action: z.string().optional(),
      responsable: z.string().optional(),
      echeance: z.string().optional(),
      statut: z.enum(['À faire', 'En cours', 'Terminé']).optional(),
    })),
  }),

  // Page 3 - Validation
  validation: z.object({
    valide_par: z.string().optional(),
    date_validation: z.string().optional(),
    observations: z.string().optional(),
    prochaine_revision: z.string().optional(),
  }),
});

export type RiskAnalysis = z.infer<typeof RiskAnalysisSchema>;
