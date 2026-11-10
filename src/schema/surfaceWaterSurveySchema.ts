import { z } from 'zod';

const ParameterMeasurementSchema = z.object({
  start: z.coerce.number().optional(),
  intermediate: z.coerce.number().optional(),
  end: z.coerce.number().optional(),
});

export const SurfaceWaterSurveySchema = z.object({
  name: z.string().min(1, "Le nom du prélèvement est obligatoire."),

  generalInfo: z.object({
    time: z.string().min(1, "L'heure est requise."),
    date: z.string().min(1, "La date est requise."),
    airTemperature: z.coerce.number().optional(),
    weatherCondition: z.enum(['sunny', 'cloudy', 'windy', 'rainy']),
  }),

  location: z.object({
    x: z.coerce.number().optional(),
    y: z.coerce.number().optional(),
    z: z.coerce.number().optional(),
    landmark: z.string().optional(),
  }),

  sampling: z.object({
    type: z.enum(['shore', 'upstream', 'downstream', 'other']),
    equipment: z.enum(['bucket', 'sampling-rod', 'pump']),
    depth: z.coerce.number().optional(),
  }),

  stationDescription: z.object({
    description: z.string().optional(),
    waterType: z.enum(['river', 'stream', 'brook', 'lake', 'pond']),
    estimatedFlow: z.enum(['stagnant', 'low', 'high']),
    flowType: z.enum(['laminar', 'intermediate', 'turbulent']),
    observations: z.string().optional(),
  }),

  fieldObservations: z.object({
    turbidity: z.enum(['low', 'medium', 'high']),
    waterColor: z.string().optional(),
    hasLeavesMoss: z.boolean(),
    hasFloating: z.boolean(),
    waterOdor: z.string().optional(),
    hasShade: z.boolean(),
  }),

  parameters: z.object({
    time: z.string().optional(),
    temperature: z.string().optional(),
    conductivity: z.string().optional(),
    ph: z.string().optional(),
    redox: z.string().optional(),
    remarks: z.string().optional(),
  }),

  sampleManagement: z.object({
    conditioning: z.string().optional(),
    laboratory: z.enum(['agrolab', 'als_france']),
    transporter: z.string().optional(),
    shippingDate: z.string().optional(),
  }),

  photos: z.array(z.string()).optional(),
});

export type SurfaceWaterSurveyFormData = z.infer<typeof SurfaceWaterSurveySchema>;