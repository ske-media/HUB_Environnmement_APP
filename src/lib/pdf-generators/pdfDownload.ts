import { PDFDocument, PDFForm } from 'pdf-lib';
import { fillGenericAcroform } from './fillGenericAcroform';
import {
  buildPdfFilename,
  extractSurveyDate,
  extractSurveyPointName,
} from './buildPdfFilename';

/**
 * Déclenche le téléchargement d'un PDF dans le navigateur à partir d'un buffer
 * d'octets déjà produit. Point unique utilisé par tous les types de fiches.
 */
export function triggerPdfDownload(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface PdfBundle {
  /** Octets du PDF final prêt à être sauvegardé. */
  bytes: Uint8Array;
  /** Nom de fichier recommandé (déjà normalisé par `buildPdfFilename`). */
  filename: string;
}

export interface SimplePipelineOptions<TData> {
  surveyType: string;
  templateUrl: string;
  data: TData;
  siteName: string;
  /** Transformation optionnelle des données avant remplissage (ex. retirer les URLs image). */
  prepareData?: (data: TData) => any;
  /** Hook optionnel exécuté après `fillGenericAcroform` (photos, mappings legacy…). */
  postFill?: (pdfDoc: PDFDocument, form: PDFForm, data: TData) => Promise<void> | void;
}

/**
 * Pipeline standard : charger un template, remplir via `fillGenericAcroform`,
 * aplatir, sauver. Les générateurs "simples" (sans enrichissement ou logique
 * complexe) se ramènent à un appel à cette fonction.
 */
export async function runSimplePdfPipeline<TData>(
  options: SimplePipelineOptions<TData>,
): Promise<PdfBundle> {
  const { surveyType, templateUrl, data, siteName, prepareData, postFill } = options;

  const absoluteUrl = new URL(templateUrl, window.location.origin).toString();
  const response = await fetch(absoluteUrl);
  if (!response.ok) {
    throw new Error(
      `Impossible de charger le template PDF: ${response.status} ${response.statusText}`,
    );
  }

  const templateBytes = new Uint8Array(await response.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  const dataForFilling = prepareData ? prepareData(data) : data;
  await fillGenericAcroform(pdfDoc, form, dataForFilling as Record<string, any>);

  if (postFill) await postFill(pdfDoc, form, data);

  try {
    form.flatten();
  } catch (flattenError) {
    console.warn('Erreur lors de l\'aplatissement du formulaire PDF:', flattenError);
  }

  const bytes = await pdfDoc.save();
  const dataAsRecord = data as any;
  const filename = buildPdfFilename({
    surveyType,
    commune: dataAsRecord?.commune,
    fallbackCommune: siteName,
    point: extractSurveyPointName(surveyType, data),
    date: extractSurveyDate(data),
  });

  return { bytes, filename };
}
