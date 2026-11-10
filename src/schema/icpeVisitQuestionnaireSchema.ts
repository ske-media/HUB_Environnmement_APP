import { z } from 'zod';

// Schéma très détaillé pour le questionnaire de visite ICPE (5 pages du PDF)
export const IcpeVisitQuestionnaireSchema = z.object({
  // Page 1 - Identité
  identite: z.object({
    nom_exploitant: z.string().min(1, 'Le nom de l\'exploitant est obligatoire'),
    numero_dossier_icpe: z.string().min(1, 'Le numéro de dossier ICPE est obligatoire'),
    date_visite: z.string().optional(),
    inspecteur: z.string().optional(),
    adresse_site: z.string().optional(),
    activite_principale: z.string().optional(),
    effectif: z.coerce.number().optional(),
  }),

  // Page 2 - Rubriques (tableau)
  rubriques: z.array(z.object({
    numero_rubrique: z.string().optional(),
    libelle: z.string().optional(),
    regime: z.enum(['Déclaration', 'Enregistrement', 'Autorisation']).optional(),
    statut: z.enum(['Conforme', 'Non conforme', 'À vérifier']).optional(),
    observations: z.string().optional(),
  })),

  // Page 3 - Rapports d'inspection
  rapports_inspection: z.object({
    dernier_rapport: z.object({
      date: z.string().optional(),
      type: z.enum(['Contrôle', 'Inspection', 'Visite']).optional(),
      resultat: z.enum(['Conforme', 'Non conforme', 'Mise en demeure']).optional(),
      observations: z.string().optional(),
    }),
    rapports_anterieurs: z.array(z.object({
      date: z.string().optional(),
      type: z.string().optional(),
      resultat: z.string().optional(),
      observations: z.string().optional(),
    })),
  }),

  // Page 4 - Mise en sécurité
  mise_en_securite: z.object({
    acces: z.object({
      signalisation: z.boolean().optional(),
      cloture: z.boolean().optional(),
      portail: z.boolean().optional(),
      eclairage: z.boolean().optional(),
      observations: z.string().optional(),
    }),
    evacuation_produits: z.object({
      systeme_evacuation: z.boolean().optional(),
      capacite_suffisante: z.boolean().optional(),
      maintenance: z.boolean().optional(),
      observations: z.string().optional(),
    }),
    vidange_nettoyage: z.object({
      procedure_etablie: z.boolean().optional(),
      frequence: z.string().optional(),
      responsable: z.string().optional(),
      observations: z.string().optional(),
    }),
    prevention_incendie: z.object({
      extincteurs: z.boolean().optional(),
      detection: z.boolean().optional(),
      alarme: z.boolean().optional(),
      observations: z.string().optional(),
    }),
  }),

  // Page 5 - Gestion environnementale
  gestion_environnementale: z.object({
    dechets: z.object({
      tri: z.boolean().optional(),
      stockage: z.boolean().optional(),
      registre: z.boolean().optional(),
      bsd: z.boolean().optional(),
      observations: z.string().optional(),
    }),
    eau: z.object({
      reseau_pluviales: z.boolean().optional(),
      dispositif_anti_pollution: z.boolean().optional(),
      rejets_conformes: z.boolean().optional(),
      observations: z.string().optional(),
    }),
    air: z.object({
      mesures_rejets: z.boolean().optional(),
      installations_captage: z.boolean().optional(),
      bruit_voisinage: z.boolean().optional(),
      observations: z.string().optional(),
    }),
    produits_chimiques: z.object({
      stockage_retention: z.boolean().optional(),
      compatibilite: z.boolean().optional(),
      fds_disponibles: z.boolean().optional(),
      observations: z.string().optional(),
    }),
  }),

  // Page 5 - Synthèse
  synthese: z.object({
    points_conformite: z.string().optional(),
    points_non_conformite: z.string().optional(),
    plan_actions: z.string().optional(),
    prochaine_visite: z.string().optional(),
    signature_inspecteur: z.string().optional(),
    date_signature: z.string().optional(),
  }),
});

export type IcpeVisitQuestionnaire = z.infer<typeof IcpeVisitQuestionnaireSchema>;
