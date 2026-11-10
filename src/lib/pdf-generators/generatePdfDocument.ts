import { PDFCheckBox, PDFDocument, PDFForm, PDFTextField } from 'pdf-lib';
import { fillGenericAcroform } from './fillGenericAcroform';
import { embedPhotoInField, embedPhotoInFirstMatchingField } from './embedPhoto';
import {
  buildPdfFilename,
  extractSurveyDate,
  extractSurveyPointName,
} from './buildPdfFilename';
import {
  runSimplePdfPipeline,
  triggerPdfDownload,
  type PdfBundle,
} from './pdfDownload';
import { supabase } from '../supabase';
import { GAS_TYPE_CONDITIONNEMENT } from '../../schema/gasSurveySchema';

type GeneratorContext = {
  surveyType: string;
  surveyData: any;
  siteName: string;
  siteId?: string;
};

type GeneratorConfig = {
  templateUrl: string;
  filenamePrefix: string;
  prepareData?: (data: any) => any;
  postFill?: (pdfDoc: PDFDocument, form: PDFForm, data: any) => Promise<void> | void;
};

const SUBSTANCE_LABELS: Record<string, string> = {
  hct: 'HCT',
  hap: 'HAP',
  btex: 'BTEX',
  cohv: 'COHV',
  pcb: 'PCB',
  metaux: 'ETM',
  pesticides: 'PESTICIDES',
  pfas: 'PFAS',
  phenol: 'PHENOL',
};

const SURVEY_PDF_CONFIG: Record<string, GeneratorConfig> = {
  soil: {
    templateUrl: '/pdf-templates/soil-survey-form-template.pdf',
    filenamePrefix: 'soil',
  },
  gas: {
    templateUrl: '/pdf-templates/gas-survey-form-template.pdf',
    filenamePrefix: 'gas',
    prepareData: (data) => {
      const copy = JSON.parse(JSON.stringify(data));
      if (copy.visualisation_point_prelevement) {
        copy.visualisation_point_prelevement = '';
      }
      if (!copy.conditionnement_transport) copy.conditionnement_transport = {};
      copy.conditionnement_transport.type_conditionnement = GAS_TYPE_CONDITIONNEMENT;
      return copy;
    },
    postFill: async (pdfDoc, form, data) => {
      if (data.visualisation_point_prelevement) {
        await embedPhotoInFirstMatchingField(
          pdfDoc,
          form,
          [
            'visualisation_point_prelevement_placeholder',
            'visualisation_point_prelevement',
          ],
          data.visualisation_point_prelevement,
        );
      }
    },
  },
  excavation: {
    templateUrl: '/pdf-templates/excavation-survey-form-template.pdf',
    filenamePrefix: 'excavation',
  },
  groundwater: {
    templateUrl: '/pdf-templates/groundwater-survey-form-template.pdf',
    filenamePrefix: 'groundwater',
    prepareData: (data) => ({
      ...data,
      description_piezometre: {
        ...data.description_piezometre,
        photographie_url: undefined,
      },
    }),
    postFill: async (pdfDoc, form, data) => {
      applyGroundwaterLegacyMappings(form, data);
      const photoUrl = data.description_piezometre?.photographie_url;
      if (photoUrl) {
        await embedPhotoInFirstMatchingField(
          pdfDoc,
          form,
          [
            'description_piezometre.photographie_url',
            'photographie_url',
            'photo_piezometre',
            'photo_piezometre_placeholder',
          ],
          photoUrl,
        );
      }
    },
  },
  pid: {
    templateUrl: '/pdf-templates/pid-survey-form-template.pdf',
    filenamePrefix: 'pid',
  },
  sediment: {
    templateUrl: '/pdf-templates/sediment-survey-form-template.pdf',
    filenamePrefix: 'sediment',
  },
  surface_water: {
    templateUrl: '/pdf-templates/surface-water-survey-form-template.pdf',
    filenamePrefix: 'surface_water',
  },
  tap_water: {
    templateUrl: '/pdf-templates/tap-water-survey-form-template.pdf',
    filenamePrefix: 'tap_water',
  },
  risk_analysis: {
    templateUrl: '/pdf-templates/risk-analysis-form-template.pdf',
    filenamePrefix: 'risk_analysis',
  },
  icpe_visit: {
    templateUrl: '/pdf-templates/icpe-visit-questionnaire-form-template.pdf',
    filenamePrefix: 'icpe_visit',
  },
  ambient_air: {
    templateUrl: '/pdf-templates/ambient-air-survey-form-template.pdf',
    filenamePrefix: 'ambient_air',
  },
  equipment_tracking: {
    templateUrl: '/pdf-templates/equipment-tracking-form-template.pdf',
    filenamePrefix: 'equipment_tracking',
  },
  garden_questionnaire: {
    templateUrl: '/pdf-templates/garden-questionnaire-form-template.pdf',
    filenamePrefix: 'garden_questionnaire',
  },
  piezometric: {
    templateUrl: '/pdf-templates/piezometric-survey-form-template.pdf',
    filenamePrefix: 'piezometric',
  },
  radon_soil: {
    templateUrl: '/pdf-templates/radon-soil-survey-form-template.pdf',
    filenamePrefix: 'radon_soil',
  },
  site_visit: {
    templateUrl: '/pdf-templates/site-visit-questionnaire-form-template.pdf',
    filenamePrefix: 'site_visit',
  },
};

function getSurveyConfig(surveyType: string): GeneratorConfig {
  const config = SURVEY_PDF_CONFIG[surveyType];
  if (!config) {
    throw new Error(
      `Type de fiche non reconnu : "${surveyType}". Types supportés : ${Object.keys(SURVEY_PDF_CONFIG).join(', ')}`,
    );
  }
  return config;
}

function applyGroundwaterLegacyMappings(form: PDFForm, data: any): void {
  const nettoyage = data.echantillonnage?.nettoyage_materiel;
  const nettoyageMap: Array<{ value: string; fieldNames: string[] }> = [
    { value: 'Eau claire', fieldNames: ['eau claire', 'eau_claire', 'nettoyage_eau_claire'] },
    { value: 'Alcool', fieldNames: ['Alcool', 'alcool', 'nettoyage_alcool'] },
    { value: 'Autre', fieldNames: ['Autre nettoyant', 'autre_nettoyant', 'nettoyage_autre'] },
  ];

  for (const entry of nettoyageMap) {
    for (const fieldName of entry.fieldNames) {
      const field = form.getFieldMaybe(fieldName);
      if (field instanceof PDFCheckBox) {
        nettoyage === entry.value ? field.check() : field.uncheck();
        break;
      }
    }
  }

  const substances = data.conditionnement?.substances;
  if (!substances) return;

  const labels = Object.entries(substances)
    .filter(([, checked]) => Boolean(checked))
    .map(([key]) => SUBSTANCE_LABELS[key] || key.toUpperCase())
    .filter(Boolean);
  const concatenated = labels.join(', ');
  const candidateFieldNames = [
    'HCT,HAP,BETX,COHV,PCB,ETM',
    'substances_recherchees',
    'conditionnement.substances_recherchees',
    'substances',
  ];

  for (const fieldName of candidateFieldNames) {
    const field = form.getFieldMaybe(fieldName);
    if (field instanceof PDFTextField) {
      field.setText(concatenated);
      break;
    }
  }
}

async function generateSoilPdfBytes({ surveyData, siteName, siteId }: GeneratorContext): Promise<PdfBundle> {
  const enrichedData = { ...surveyData };
  let siteCommune: string | null = null;

  if (siteId) {
    try {
      const { data: siteData, error: siteError } = await supabase
        .from('sites')
        .select('project_manager, drilling_company, city')
        .eq('id', siteId)
        .single();
      if (!siteError && siteData) {
        if (siteData.project_manager) enrichedData.responsable_projet = siteData.project_manager;
        if (siteData.drilling_company) {
          enrichedData.sondage_info = {
            ...(enrichedData.sondage_info || {}),
            prestataire: siteData.drilling_company,
          };
        }
        if (siteData.city) siteCommune = siteData.city;
      }
    } catch (error) {
      console.warn('Erreur lors de la récupération des données du site pour le PDF:', error);
    }
  }

  const observationCount = enrichedData.observations?.length || 1;
  const templateNumber = Math.max(1, Math.min(6, observationCount));
  const templateUrl = `/pdf-templates/soil-survey-form-template-${templateNumber}.pdf`;

  const loadTemplate = async (url: string) => {
    const absolute = new URL(url, window.location.origin).toString();
    const response = await fetch(absolute);
    if (!response.ok) {
      throw new Error(
        `Impossible de charger le template PDF: ${response.status} ${response.statusText}`,
      );
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    return PDFDocument.load(bytes);
  };

  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await loadTemplate(templateUrl);
  } catch (primaryError: any) {
    if (
      primaryError?.message?.includes('Failed to parse') ||
      primaryError?.message?.includes('invalid PDF') ||
      primaryError?.message?.includes('parse PDF document') ||
      primaryError?.message?.includes('404')
    ) {
      pdfDoc = await loadTemplate('/pdf-templates/soil-form-template.pdf');
    } else {
      throw primaryError;
    }
  }

  const form = pdfDoc.getForm();
  const dataWithoutPhotoUrls = {
    ...enrichedData,
    observations: enrichedData.observations?.map((obs: any) => {
      const { photo_lithologie_url, ...rest } = obs;
      return {
        ...rest,
        echantillons: obs.echantillons || '',
      };
    }),
    photos: enrichedData.photos
      ? { ...enrichedData.photos, photo_sondage_url: undefined }
      : undefined,
  };

  await fillGenericAcroform(pdfDoc, form, dataWithoutPhotoUrls);

  if (enrichedData.observations?.length) {
    for (let i = 0; i < enrichedData.observations.length; i++) {
      const observation = enrichedData.observations[i];
      if (observation.echantillons != null) {
        const fieldName = `observations.${i}.echantillons`;
        try {
          const field = form.getTextField(fieldName);
          if (field) field.setText(String(observation.echantillons));
        } catch (error) {
          console.warn(`Impossible de remplir explicitement ${fieldName}:`, error);
        }
      }
    }
  }

  if (enrichedData.photos?.photo_sondage_url) {
    await embedPhotoInField(
      pdfDoc,
      form,
      'photos.photo_sondage_url',
      enrichedData.photos.photo_sondage_url,
    );
  }

  if (enrichedData.observations?.length) {
    for (let i = 0; i < enrichedData.observations.length; i++) {
      const observation = enrichedData.observations[i];
      if (observation.photo_lithologie_url) {
        await embedPhotoInField(
          pdfDoc,
          form,
          `observations.${i}.photo_lithologie_url`,
          observation.photo_lithologie_url,
        );
      }
    }
  }

  form.flatten();
  const bytes = await pdfDoc.save();
  const filename = buildPdfFilename({
    surveyType: 'soil',
    commune: siteCommune || enrichedData.commune,
    fallbackCommune: siteName,
    point: extractSurveyPointName('soil', enrichedData),
    date: extractSurveyDate(enrichedData),
  });

  return { bytes, filename };
}

export async function generatePdfBytesForSurvey(
  surveyType: string,
  surveyData: any,
  siteName: string,
  siteId?: string,
): Promise<PdfBundle> {
  if (surveyType === 'soil') {
    return generateSoilPdfBytes({ surveyType, surveyData, siteName, siteId });
  }

  const config = getSurveyConfig(surveyType);
  return runSimplePdfPipeline({
    surveyType: config.filenamePrefix,
    templateUrl: config.templateUrl,
    data: surveyData,
    siteName,
    prepareData: config.prepareData,
    postFill: config.postFill,
  });
}

export async function generateAndDownloadPdf(
  surveyType: string,
  surveyData: any,
  siteName: string,
  siteId?: string,
): Promise<void> {
  const { bytes, filename } = await generatePdfBytesForSurvey(
    surveyType,
    surveyData,
    siteName,
    siteId,
  );
  triggerPdfDownload(bytes, filename);
}
