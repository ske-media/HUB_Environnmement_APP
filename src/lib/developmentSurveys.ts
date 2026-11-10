// Liste des IDs de fiches en cours de développement
export const DEVELOPMENT_SURVEY_IDS = [
  'ambient_air',
  'surface_water',
  'piezometric',
  'tap_water',
  'sediment',
  'excavation',
  'risk_analysis',
  'radon_soil',
  'site_visit',
  'equipment_tracking',
  'garden_questionnaire',
  'icpe_visit',
] as const;

export type DevelopmentSurveyId = typeof DEVELOPMENT_SURVEY_IDS[number];

export function isDevelopmentSurvey(surveyId: string): boolean {
  return DEVELOPMENT_SURVEY_IDS.includes(surveyId as DevelopmentSurveyId);
}
