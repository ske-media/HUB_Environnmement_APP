import { z } from 'zod';

// Schéma pour une ligne d'observation dans le tableau
export const ObservationSchema = z.object({
  profondeur_m: z.string().optional(),
  description_lithologique: z.string().optional(),
  eau: z.string().optional(),
  organoleptiques: z.string().optional(),
  pid_ppm: z.number().optional(),
  echantillons: z.string().optional(),
  remarques: z.string().optional(),
  photo_lithologie_url: z.string().optional(),
});

// Schéma principal pour la Fiche de Sondage de Sols
export const SoilSurveySchema = z.object({
  // Section En-tête (generalInfo)
  designation_point: z.string().min(1, "La désignation du point est requise."),
  numero_projet: z.string().optional(), // Inhérent au site, ne plus afficher dans le formulaire
  client: z.string().optional(), // Inhérent au site, ne plus afficher dans le formulaire
  commune: z.string().optional(), // Inhérent au site, ne plus afficher dans le formulaire
  responsable_projet: z.string().optional(),
  preleveur: z.string().optional(), // Nouveau champ menu déroulant
  operateur: z.string().optional(), // Conservé pour compatibilité
  date: z.string().min(1, "La date est requise."),
  heure: z.string().min(1, "L'heure est requise."),
  meteo: z.enum(['Ensoleillé', 'Nuageux', 'Venteux', 'Pluvieux']).optional(),
  temperature: z.number().optional(),

  // Section Localisation (coordonnees)
  coordonnees: z.object({
    longitude: z.preprocess(
      (val) => val === '' || val === null || val === undefined ? undefined : Number(val),
      z.number().optional()
    ),
    latitude: z.preprocess(
      (val) => val === '' || val === null || val === undefined ? undefined : Number(val),
      z.number().optional()
    ),
    altitude: z.preprocess(
      (val) => val === '' || val === null || val === undefined ? undefined : Number(val),
      z.number().optional()
    ),
  }),

  // Section Informations sur le sondage (sondage_info)
  sondage_info: z.object({
    outil_sondage: z.enum(['Tarière', 'Carottage', 'Sous-gaine', 'Carotteuse portative', 'Autre']).optional(),
    outil_sondage_autre: z.string().optional(), // Précision si "Autre" est sélectionné
    prestataire: z.string().optional(), // Inhérent au site, ne plus afficher dans le formulaire
    diametre_sondage_mm: z.number().optional(),
    profondeur_atteinte_m: z.number().optional(),
    rebouchage_refection: z.enum(['Cutting', 'Béton', 'Enrobé', 'Autre']).optional(),
    rebouchage_refection_autre: z.string().optional(), // Précision si "Autre" est sélectionné
    gestion_cuttings: z.enum(['Bigbag', 'Remis en place', 'Autre']).optional(),
    gestion_cuttings_autre: z.string().optional(), // Précision si "Autre" est sélectionné
    revetement: z.enum(['Enrobé', 'Dalle', 'Autre']).optional(),
    revetement_autre: z.string().optional(), // Précision si "Autre" est sélectionné
    remarques: z.string().optional(),
  }).refine(
    (data) => {
      // Si "Autre" est sélectionné pour outil_sondage, outil_sondage_autre doit être renseigné
      if (data.outil_sondage === 'Autre') {
        return data.outil_sondage_autre !== undefined && data.outil_sondage_autre.trim() !== '';
      }
      return true;
    },
    {
      message: "Veuillez préciser l'outil de sondage",
      path: ['outil_sondage_autre'],
    }
  ).refine(
    (data) => {
      // Si "Autre" est sélectionné pour gestion_cuttings, gestion_cuttings_autre doit être renseigné
      if (data.gestion_cuttings === 'Autre') {
        return data.gestion_cuttings_autre !== undefined && data.gestion_cuttings_autre.trim() !== '';
      }
      return true;
    },
    {
      message: "Veuillez préciser la gestion des cuttings",
      path: ['gestion_cuttings_autre'],
    }
  ).refine(
    (data) => {
      // Si "Autre" est sélectionné pour rebouchage_refection, rebouchage_refection_autre doit être renseigné
      if (data.rebouchage_refection === 'Autre') {
        return data.rebouchage_refection_autre !== undefined && data.rebouchage_refection_autre.trim() !== '';
      }
      return true;
    },
    {
      message: "Veuillez préciser le rebouchage et la réfection",
      path: ['rebouchage_refection_autre'],
    }
  ).refine(
    (data) => {
      // Si "Autre" est sélectionné pour revetement, revetement_autre doit être renseigné
      if (data.revetement === 'Autre') {
        return data.revetement_autre !== undefined && data.revetement_autre.trim() !== '';
      }
      return true;
    },
    {
      message: "Veuillez préciser le revêtement",
      path: ['revetement_autre'],
    }
  ),

  // Section Observations et Mesures (observations)
  // Tableau dynamique : commence avec 1, peut en ajouter jusqu'à 6 MAX
  observations: z.array(ObservationSchema).min(1, "Au moins une observation est requise.").max(6, "Maximum 6 observations autorisées."),

  // Section Photographies (photos)
  // La photo de lithologie est portée par chaque observation
  // (`observations[].photo_lithologie_url`), pas par ce bloc.
  photos: z.object({
    photo_sondage_url: z.string().optional(),
  }).optional(),

  // Section Gestion des échantillons (gestion_echantillons)
  gestion_echantillons: z.object({
    type_flaconnage: z.enum(['Transparent (450mL)', 'Brun (350mL)']).optional(),
    laboratoire: z.enum(['ALS France', 'Eurofins', 'Agrolab']).optional(),
    expedie_le: z.string().optional(),
    conditionnement: z.string().optional(),
    codes_barre: z.string().optional(),
  }).optional(),
});

export type SoilSurveyFormData = z.infer<typeof SoilSurveySchema>;
