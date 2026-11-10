/**
 * Service d'export multi-fiches.
 *
 * Deux modes supportés :
 *   - "merge"    → un unique PDF fusionné (pdf-lib copyPages).
 *   - "zip"      → un ZIP avec sous-dossiers par type de fiche
 *                  (pas de dossier vide, noms `<slug-type>/Fiche_...pdf`).
 */

import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { generatePdfBytesForSurvey } from './registry';
import { triggerPdfDownload, type PdfBundle } from './pdfDownload';
import { sanitizeFilenameToken, getSurveyTypeLabel } from './buildPdfFilename';
import { SURVEY_TYPE_CONFIG } from '../surveyTypes';

export interface SurveyToExport {
  id: string;
  type: string;
  specific_data: any;
}

export interface ExportProgress {
  completed: number;
  total: number;
  currentLabel?: string;
}

interface SharedOptions {
  siteName: string;
  siteId?: string;
  /** Nom de fichier de l'export (sans extension). */
  exportBaseName: string;
  /** Callback de progression (appelé après chaque fiche). */
  onProgress?: (progress: ExportProgress) => void;
}

export interface ExportResult {
  /** Nombre de fiches effectivement exportées. */
  successCount: number;
  /** Fiches en échec avec le message d'erreur. */
  failures: Array<{ surveyId: string; type: string; error: string }>;
}

async function generateBundle(
  survey: SurveyToExport,
  siteName: string,
  siteId?: string,
): Promise<PdfBundle> {
  return generatePdfBytesForSurvey(survey.type, survey.specific_data, siteName, siteId);
}

/**
 * Fusionne plusieurs fiches en un unique PDF et déclenche son téléchargement.
 */
export async function exportSurveysAsMergedPdf(
  surveys: SurveyToExport[],
  options: SharedOptions,
): Promise<ExportResult> {
  const failures: ExportResult['failures'] = [];
  const mergedDoc = await PDFDocument.create();
  let successCount = 0;

  for (let i = 0; i < surveys.length; i++) {
    const survey = surveys[i];
    const typeLabel = SURVEY_TYPE_CONFIG[survey.type]?.name || survey.type;
    options.onProgress?.({
      completed: i,
      total: surveys.length,
      currentLabel: typeLabel,
    });

    try {
      const { bytes } = await generateBundle(survey, options.siteName, options.siteId);
      const sub = await PDFDocument.load(bytes);
      const pages = await mergedDoc.copyPages(sub, sub.getPageIndices());
      for (const page of pages) mergedDoc.addPage(page);
      successCount++;
    } catch (err) {
      failures.push({
        surveyId: survey.id,
        type: survey.type,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  options.onProgress?.({ completed: surveys.length, total: surveys.length });

  if (successCount === 0) {
    return { successCount, failures };
  }

  const bytes = await mergedDoc.save();
  const filename = `${sanitizeFilenameToken(options.exportBaseName) || 'Fiches'}_Fusionnees.pdf`;
  triggerPdfDownload(bytes, filename);
  return { successCount, failures };
}

/**
 * Construit un ZIP organisé par type de fiche (sous-dossier par catégorie).
 * Les dossiers vides ne sont jamais ajoutés.
 */
export async function exportSurveysAsZip(
  surveys: SurveyToExport[],
  options: SharedOptions,
): Promise<ExportResult> {
  const failures: ExportResult['failures'] = [];
  const zip = new JSZip();
  const folderCache = new Map<string, JSZip>();
  let successCount = 0;

  const folderNameFor = (type: string): string =>
    sanitizeFilenameToken(getSurveyTypeLabel(type)) ||
    sanitizeFilenameToken(SURVEY_TYPE_CONFIG[type]?.name) ||
    'Divers';

  for (let i = 0; i < surveys.length; i++) {
    const survey = surveys[i];
    const typeLabel = SURVEY_TYPE_CONFIG[survey.type]?.name || survey.type;
    options.onProgress?.({
      completed: i,
      total: surveys.length,
      currentLabel: typeLabel,
    });

    try {
      const { bytes, filename } = await generateBundle(
        survey,
        options.siteName,
        options.siteId,
      );
      const folderName = folderNameFor(survey.type);
      let folder = folderCache.get(folderName);
      if (!folder) {
        const created = zip.folder(folderName);
        if (!created) throw new Error(`Impossible de créer le dossier ZIP ${folderName}`);
        folder = created;
        folderCache.set(folderName, folder);
      }
      // Gère collisions de noms en ajoutant un suffixe incrémental.
      let finalName = filename;
      let suffix = 1;
      while (folder.file(finalName)) {
        const extIndex = filename.lastIndexOf('.');
        const base = extIndex > 0 ? filename.slice(0, extIndex) : filename;
        const ext = extIndex > 0 ? filename.slice(extIndex) : '';
        finalName = `${base}_${suffix}${ext}`;
        suffix++;
      }
      folder.file(finalName, bytes);
      successCount++;
    } catch (err) {
      failures.push({
        surveyId: survey.id,
        type: survey.type,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  options.onProgress?.({ completed: surveys.length, total: surveys.length });

  if (successCount === 0) {
    return { successCount, failures };
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipName = `${sanitizeFilenameToken(options.siteName) || 'Fiches'}.zip`;
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return { successCount, failures };
}
