import { z } from 'zod';

export const EquipmentTrackingSchema = z.object({
  nom_mission: z.string().min(1, 'Le nom de la mission est obligatoire'),
  technicien_responsable: z.string().min(1, 'Le technicien responsable est obligatoire'),
  date_depart: z.string().min(1, 'La date de départ est obligatoire'),
  date_retour_prevue: z.string().min(1, 'La date de retour prévue est obligatoire'),
  vehicule_utilise: z.string().optional(),
  
  appareils_mesure: z.array(z.object({
    nom_appareil: z.string().min(1, 'Le nom de l\'appareil est obligatoire'),
    numero_serie: z.string().min(1, 'Le numéro de série est obligatoire'),
    etat_depart: z.enum(['OK', 'Défaut'], {
      required_error: 'L\'état de départ est obligatoire'
    }),
    etat_retour: z.enum(['OK', 'Défaut'], {
      required_error: 'L\'état de retour est obligatoire'
    }),
    remarques: z.string().optional()
  })).default([]),
  
  materiel_prelevement: z.array(z.object({
    nom_materiel: z.string().min(1, 'Le nom du matériel est obligatoire'),
    quantite_depart: z.number().min(0, 'La quantité de départ doit être positive'),
    quantite_retour: z.number().min(0, 'La quantité de retour doit être positive')
  })).default([]),
  
  consommables: z.array(z.object({
    nom_consommable: z.string().min(1, 'Le nom du consommable est obligatoire'),
    quantite_prise: z.number().min(0, 'La quantité prise doit être positive')
  })).default([]),
  
  rapport_mission: z.object({
    problemes_rencontres: z.string().optional(),
    materiel_perdu_casse: z.string().optional()
  }).default({
    problemes_rencontres: '',
    materiel_perdu_casse: ''
  })
});

export type EquipmentTracking = z.infer<typeof EquipmentTrackingSchema>;
