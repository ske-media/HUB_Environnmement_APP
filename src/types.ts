/**
 * Types des objets persistés dans Supabase (`sites`, `surveys`) et de
 * l'utilisateur authentifié.
 *
 * Les types de formulaires sont dérivés des schémas Zod (`src/schema`) : le
 * contenu de `surveys.specific_data` est donc typé par le schéma de la fiche
 * correspondante, sélectionné par le champ `type`.
 */

import type { SoilSurveyFormData } from './schema/soilSurveySchema';
import type { GasSurveyFormData } from './schema/gasSurveySchema';
import type { AmbientAirSurveyFormData } from './schema/ambientAirSurveySchema';
import type { GroundwaterSurveyFormData } from './schema/groundwaterSurveySchema';
import type { PIDSurveyFormData } from './schema/pidSurveySchema';
import type { SurfaceWaterSurveyFormData } from './schema/surfaceWaterSurveySchema';
import type { PiezometricSurveyFormData } from './schema/piezometricSurveySchema';
import type { TapWaterSurvey } from './schema/tapWaterSurveySchema';
import type { SedimentSurvey } from './schema/sedimentSurveySchema';
import type { ExcavationSurveyFormData } from './schema/excavationSurveySchema';
import type { RiskAnalysis } from './schema/riskAnalysisSchema';
import type { RadonSoilSurvey } from './schema/radonSoilSurveySchema';
import type { SiteVisitQuestionnaire } from './schema/siteVisitQuestionnaireSchema';
import type { EquipmentTracking } from './schema/equipmentTrackingSchema';
import type { GardenQuestionnaire } from './schema/gardenQuestionnaireSchema';
import type { IcpeVisitQuestionnaire } from './schema/icpeVisitQuestionnaireSchema';

/**
 * Représente un utilisateur authentifié, tel que fourni par Supabase Auth.
 */
export interface User {
  id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  role: 'super_admin' | 'user';
}

/**
 * Représente un Site tel qu'il est stocké dans la base de données.
 * Les propriétés utilisent snake_case pour correspondre à la structure de la base de données.
 */
export interface Site {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  project_number: string;
  location: string;
  city: string;
  coordinates: { latitude: number; longitude: number; } | null;
  project_manager: string | null;
  engineer_in_charge: string | null;
  drilling_company: string | null;
  status: 'active' | 'archived';
  deleted_at: string | null;
}

/**
 * Interface de base pour tous les types de sondages.
 * Contient les métadonnées communes à chaque entrée dans la table `surveys`.
 */
interface BaseSurvey {
  id: string;
  site_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  name: string | null;
}

// Un type par fiche : `type` discrimine la forme de `specific_data`.
export interface SoilSurvey extends BaseSurvey {
  type: 'soil';
  specific_data: SoilSurveyFormData;
}

export interface GroundwaterSurvey extends BaseSurvey {
  type: 'groundwater';
  specific_data: GroundwaterSurveyFormData;
}

export interface GasSurvey extends BaseSurvey {
  type: 'gas';
  specific_data: GasSurveyFormData;
}

export interface AmbientAirSurvey extends BaseSurvey {
  type: 'ambient_air';
  specific_data: AmbientAirSurveyFormData;
}

export interface SurfaceWaterSurvey extends BaseSurvey {
  type: 'surface_water';
  specific_data: SurfaceWaterSurveyFormData;
}

export interface PIDSurvey extends BaseSurvey {
  type: 'pid';
  specific_data: PIDSurveyFormData;
}

export interface PiezometricSurvey extends BaseSurvey {
  type: 'piezometric';
  specific_data: PiezometricSurveyFormData;
}

export interface TapWaterSurveyType extends BaseSurvey {
  type: 'tap_water';
  specific_data: TapWaterSurvey;
}

export interface SedimentSurveyType extends BaseSurvey {
  type: 'sediment';
  specific_data: SedimentSurvey;
}

export interface ExcavationSurvey extends BaseSurvey {
  type: 'excavation';
  specific_data: ExcavationSurveyFormData;
}

export interface RiskAnalysisSurvey extends BaseSurvey {
  type: 'risk_analysis';
  specific_data: RiskAnalysis;
}

export interface RadonSoilSurveyType extends BaseSurvey {
  type: 'radon_soil';
  specific_data: RadonSoilSurvey;
}

export interface SiteVisitQuestionnaireSurvey extends BaseSurvey {
  type: 'site_visit';
  specific_data: SiteVisitQuestionnaire;
}

export interface EquipmentTrackingSurvey extends BaseSurvey {
  type: 'equipment_tracking';
  specific_data: EquipmentTracking;
}

export interface GardenQuestionnaireSurvey extends BaseSurvey {
  type: 'garden_questionnaire';
  specific_data: GardenQuestionnaire;
}

export interface IcpeVisitQuestionnaireSurvey extends BaseSurvey {
  type: 'icpe_visit';
  specific_data: IcpeVisitQuestionnaire;
}


/**
 * Union discriminée de toutes les fiches : tester `survey.type` donne accès au
 * `specific_data` correspondant.
 */
export type Survey =
  | SoilSurvey
  | GroundwaterSurvey
  | GasSurvey
  | AmbientAirSurvey
  | SurfaceWaterSurvey
  | PIDSurvey
  | PiezometricSurvey
  | TapWaterSurveyType
  | SedimentSurveyType
  | ExcavationSurvey
  | RiskAnalysisSurvey
  | RadonSoilSurveyType
  | SiteVisitQuestionnaireSurvey
  | EquipmentTrackingSurvey
  | GardenQuestionnaireSurvey
  | IcpeVisitQuestionnaireSurvey;