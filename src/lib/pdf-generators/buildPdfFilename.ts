import { getLocalDateString } from '../utils';

/**
 * Convention de nommage des PDF exportés.
 *
 *    Fiche_<TYPE>_<COMMUNE>_<POINT>_<DATE>.pdf
 *
 * - TYPE    : libellé court normalisé (sans accents, sans espaces).
 * - COMMUNE : ville du site (ou projet_number si absente).
 * - POINT   : identifiant du prélèvement/ouvrage/point (si disponible).
 * - DATE    : YYYY-MM-DD (`getLocalDateString` en heure locale).
 *
 * Tous les tokens sont :
 *   - Asciifiés (suppression des diacritiques)
 *   - Nettoyés des caractères interdits par Windows/macOS/Linux (\\ / : * ? " < > |)
 *   - Compactés : espaces → `_`, runs de `_` réduits, longueur max 60.
 *
 * Les tokens vides sont ignorés (pas de `__` en sortie).
 */

const MAX_TOKEN_LENGTH = 60;

export const SURVEY_TYPE_LABELS: Record<string, string> = {
  soil: 'Sondage_Sol',
  groundwater: 'Eau_Souterraine',
  ambient_air: 'Air_Ambiant',
  gas: 'Gaz_Sol',
  surface_water: 'Eau_Superficielle',
  pid: 'Campagne_PID',
  piezometric: 'Piezometrie',
  tap_water: 'Eau_Robinet',
  sediment: 'Sediments',
  excavation: 'Suivi_Fouille',
  risk_analysis: 'Analyse_Risques',
  radon_soil: 'Radon_Sol',
  site_visit: 'Visite_Site',
  equipment_tracking: 'Suivi_Materiel',
  garden_questionnaire: 'Questionnaire_Jardin',
  icpe_visit: 'Visite_ICPE',
};

export function getSurveyTypeLabel(type: string): string {
  return SURVEY_TYPE_LABELS[type] || 'Fiche';
}

function stripDiacritics(input: string): string {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function sanitizeFilenameToken(
  raw: string | null | undefined,
  maxLength: number = MAX_TOKEN_LENGTH,
): string {
  if (!raw) return '';
  let value = stripDiacritics(String(raw)).trim();
  // caractères interdits ou à éviter
  value = value.replace(/[\\/:*?"<>|]+/g, ' ');
  // caractères de contrôle
  value = value.replace(/[\x00-\x1f]+/g, ' ');
  // remplace tous les séparateurs par underscore
  value = value.replace(/[\s._-]+/g, '_');
  // compacte les _
  value = value.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  if (value.length > maxLength) value = value.slice(0, maxLength).replace(/_+$/, '');
  return value;
}

interface BuildPdfFilenameOptions {
  /** Type de fiche (`survey.type`). Si inconnu → "Fiche". */
  surveyType: string;
  /** Commune (ville) du site. */
  commune?: string | null;
  /** Nom du point / ouvrage / prélèvement. */
  point?: string | null;
  /**
   * Date au format `YYYY-MM-DD`. Si absent → date locale du jour.
   */
  date?: string | null;
  /** Repli si `commune` est vide (souvent le numéro d'affaire). */
  fallbackCommune?: string | null;
  /** Extension (default "pdf"). */
  extension?: string;
}

/**
 * Construit le nom de fichier final en suivant la convention ci-dessus.
 */
export function buildPdfFilename(options: BuildPdfFilenameOptions): string {
  const {
    surveyType,
    commune,
    point,
    date,
    fallbackCommune,
    extension = 'pdf',
  } = options;

  const typeToken = sanitizeFilenameToken(getSurveyTypeLabel(surveyType)) || 'Fiche';
  const communeToken =
    sanitizeFilenameToken(commune) || sanitizeFilenameToken(fallbackCommune);
  const pointToken = sanitizeFilenameToken(point);
  const dateToken = sanitizeFilenameToken(date || getLocalDateString());

  const parts = ['Fiche', typeToken, communeToken, pointToken, dateToken].filter(Boolean);
  return `${parts.join('_')}.${extension}`;
}

// ---------------------------------------------------------------------------
// Extraction du "point" depuis les specific_data selon le type de fiche.
// ---------------------------------------------------------------------------

/**
 * Heuristique pour extraire l'identifiant du point/ouvrage à partir des
 * `specific_data`. Centralisé ici pour ne pas dupliquer la logique dans chaque
 * générateur. Retourne `null` si rien n'est exploitable.
 */
export function extractSurveyPointName(surveyType: string, specificData: any): string | null {
  if (!specificData) return null;
  const data = specificData;

  switch (surveyType) {
    case 'groundwater':
    case 'piezometric':
      return data.nom_ouvrage || null;
    case 'ambient_air':
      return data.samplingName || data.nom_prelevement || null;
    case 'surface_water':
      return data.name || data.nom_prelevement || null;
    case 'soil':
      return (
        data.designation_point ||
        data.nom_prelevement ||
        data.nom_echantillon ||
        data.sondage_info?.nom ||
        null
      );
    case 'gas':
    case 'tap_water':
    case 'sediment':
    case 'radon_soil':
    case 'pid':
      return data.nom_prelevement || data.designation_point || null;
    case 'excavation':
      return data.nom_fouille || data.nom_prelevement || null;
    case 'risk_analysis':
      return data.nom_intervention || data.designation_point || null;
    case 'equipment_tracking':
      return data.nom_chantier || data.reference_materiel || null;
    case 'garden_questionnaire':
      return data.nom_proprietaire || data.adresse || null;
    case 'icpe_visit':
    case 'site_visit':
      return data.nom_site || data.designation_point || null;
    default:
      return (
        data.nom_prelevement ||
        data.nom_ouvrage ||
        data.samplingName ||
        data.name ||
        data.nom_echantillon ||
        null
      );
  }
}

/**
 * Heuristique pour extraire une date (YYYY-MM-DD) depuis les specific_data
 * (date de prélèvement, date d'ouvrage...). Retourne `null` si absent.
 */
export function extractSurveyDate(specificData: any): string | null {
  if (!specificData) return null;
  const candidates = [
    specificData.date,
    specificData.date_prelevement,
    specificData.echantillonnage?.date_prelevement,
    specificData.sondage_info?.date,
    specificData.conditionnement?.date_envoi,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && /^\d{4}-\d{2}-\d{2}/.test(c)) {
      return c.slice(0, 10);
    }
  }
  return null;
}
