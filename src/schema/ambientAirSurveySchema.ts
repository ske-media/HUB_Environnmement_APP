import { z } from 'zod';

export const AmbientAirSurveySchema = z.object({
  samplingName: z.string().min(1, "Le nom du prélèvement est obligatoire."),
  
  location: z.object({
    room: z.string().min(1, "La pièce est requise."),
    position: z.string().min(1, "La position est requise."),
    coordinates: z.object({
      latitude: z.coerce.number().optional(),
      longitude: z.coerce.number().optional(),
    }),
  }),
  
  date: z.string().min(1, "La date est requise."),
  time: z.string().min(1, "L'heure est requise."),

  weatherConditions: z.object({
    description: z.string().optional(),
    externalTemp: z.coerce.number().optional(),
    internalTemp: z.coerce.number().optional(),
    pressure: z.coerce.number().optional(),
    humidity: z.coerce.number().optional(),
    windSpeedDirection: z.string().optional(),
  }),

  sampling: z.object({
    type: z.enum(['active-pump', 'active-natural', 'passive']),
    supportCount: z.coerce.number().min(1, "Le nombre de supports est requis."),
    supportType: z.string().optional(),
    installationDescription: z.string().optional(),
    height: z.coerce.number().optional(),
    ventilation: z.boolean(),
    recentWork: z.string().optional(),
    heating: z.string().optional(),
    interferingSources: z.string().optional(),
    interferingActivities: z.string().optional(),
  }),

  measurements: z.object({
    pid: z.coerce.number().optional(),
    o2: z.coerce.number().optional(),
    h2s: z.coerce.number().optional(),
    ch4: z.coerce.number().optional(),
    co: z.coerce.number().optional(),
  }),

  flow: z.object({
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    duration: z.coerce.number().optional(),
    flowRates: z.object({
      start: z.coerce.number().optional(),
      intermediate: z.coerce.number().optional(),
      end: z.coerce.number().optional(),
    }),
    averageFlow: z.coerce.number().optional(),
    totalVolume: z.coerce.number().optional(),
  }),

  laboratory: z.object({
    name: z.string().optional(),
    packaging: z.string().optional(),
    transporter: z.string().optional(),
    deliveryDate: z.string().optional(),
    substancesToAnalyze: z.string().optional(),
  }),
});

export type AmbientAirSurveyFormData = z.infer<typeof AmbientAirSurveySchema>;