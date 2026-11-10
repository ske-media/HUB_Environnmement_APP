import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, PDFRadioGroup } from 'pdf-lib';
import { flattenObject } from '../utils/flattenObject';
import { addSurveyPdfAliases } from './pdfFieldAliases';
import {
  findMatchingRadioOption,
  isOuiNonRadioOptions,
  isTruthyCheckboxValue,
} from './pdfRadioMatching';

function normalizeToken(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (normalized === 'numerodaffaire' || normalized === 'numerodelaffaire') {
    return 'numeroaffaire';
  }
  if (normalized === 'nomdupreleveur') {
    return 'nompreleveur';
  }
  return normalized;
}

function withAliasKey(baseKey: string, aliasLeaf: string): string {
  const parts = baseKey.split('.');
  parts[parts.length - 1] = aliasLeaf;
  return parts.join('.');
}

/**
 * Injecte des alias de clés pour absorber les écarts fréquents entre
 * nomenclature formulaire et nomenclature template PDF.
 */
function addCommonHeaderAliases(flattenedData: Record<string, any>): Record<string, any> {
  const expanded: Record<string, any> = { ...flattenedData };

  for (const [key, value] of Object.entries(flattenedData)) {
    const leaf = key.split('.').pop() || key;
    const normalizedLeaf = normalizeToken(leaf);

    if (normalizedLeaf === 'numeroprojet') {
      const alias = withAliasKey(key, 'numero_affaire');
      if (expanded[alias] === undefined || expanded[alias] === '') {
        expanded[alias] = value;
      }
    }
    if (normalizedLeaf === 'numeroaffaire') {
      const alias = withAliasKey(key, 'numero_projet');
      if (expanded[alias] === undefined || expanded[alias] === '') {
        expanded[alias] = value;
      }
    }

    if (normalizedLeaf === 'operateur') {
      const alias = withAliasKey(key, 'preleveur');
      if (expanded[alias] === undefined || expanded[alias] === '') {
        expanded[alias] = value;
      }
    }

    if (
      normalizedLeaf === 'preleveur' ||
      normalizedLeaf === 'nompreleveur' ||
      normalizedLeaf === 'nomdupreleveur'
    ) {
      const aliasPreleveur = withAliasKey(key, 'preleveur');
      const aliasNomPreleveur = withAliasKey(key, 'nom_preleveur');

      if (expanded[aliasPreleveur] === undefined || expanded[aliasPreleveur] === '') {
        expanded[aliasPreleveur] = value;
      }
      if (expanded[aliasNomPreleveur] === undefined || expanded[aliasNomPreleveur] === '') {
        expanded[aliasNomPreleveur] = value;
      }
    }
  }

  return expanded;
}

/**
 * Remplit un template PDF AcroForm avec les données fournies.
 * Utilise la fonction flattenObject pour aplatir les données et les mapper aux champs du PDF.
 */
export async function fillGenericAcroform(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pdfDoc: PDFDocument,
  form: PDFForm,
  data: Record<string, any>,
): Promise<void> {
  try {
    const flattenedData = addSurveyPdfAliases(
      addCommonHeaderAliases(flattenObject(data)),
    );

    const fields = form.getFields();

    const normalizedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(flattenedData)) {
      const normalizedKey = normalizeToken(key);
      normalizedData[normalizedKey] = value;
      normalizedData[key] = value;
    }

    const unmatchedFields: string[] = [];
    const matchedFields: string[] = [];

    for (const field of fields) {
      const fieldName = field.getName();
      const normalizedFieldName = normalizeToken(fieldName);

      let matchingKey: string | undefined;
      let matchedValue: any;

      matchingKey = Object.keys(flattenedData).find((key) => key === fieldName);
      if (matchingKey) {
        matchedValue = flattenedData[matchingKey];
      }

      if (!matchingKey) {
        matchingKey = Object.keys(flattenedData).find(
          (key) =>
            key === fieldName ||
            key.endsWith(`.${fieldName}`) ||
            fieldName.endsWith(`.${key}`) ||
            key.split('.').pop() === fieldName,
        );
        if (matchingKey) {
          matchedValue = flattenedData[matchingKey];
        }
      }

      if (!matchingKey) {
        matchingKey = Object.keys(normalizedData).find((key) => {
          const normalizedKey = normalizeToken(key);
          return normalizedKey === normalizedFieldName;
        });
        if (matchingKey) {
          matchedValue = normalizedData[matchingKey];
        }
      }

      if (!matchingKey) {
        matchingKey = Object.keys(flattenedData).find((key) => {
          const normalizedKey = normalizeToken(key);
          return (
            normalizedKey.includes(normalizedFieldName) ||
            normalizedFieldName.includes(normalizedKey)
          );
        });
        if (matchingKey) {
          matchedValue = flattenedData[matchingKey];
        }
      }

      const shouldFillField =
        matchingKey &&
        matchedValue !== undefined &&
        (typeof matchedValue === 'boolean' || matchedValue !== '');

      if (shouldFillField) {
        try {
          if (field instanceof PDFTextField) {
            let textValue: string;
            if (typeof matchedValue === 'boolean') {
              textValue = matchedValue ? 'OUI' : 'NON';
            } else {
              textValue = String(matchedValue);
            }
            field.setText(textValue);
            matchedFields.push(`${fieldName} <- ${matchingKey}`);
          } else if (field instanceof PDFCheckBox) {
            if (isTruthyCheckboxValue(matchedValue)) {
              field.check();
            } else {
              field.uncheck();
            }
            matchedFields.push(`${fieldName} <- ${matchingKey}`);
          } else if (field instanceof PDFRadioGroup) {
            const options = field.getOptions();

            if (typeof matchedValue === 'boolean' && !isOuiNonRadioOptions(options)) {
              unmatchedFields.push(
                `${fieldName} (radio booléen ignoré, options: ${options.join(', ')})`,
              );
              continue;
            }

            const matchingOption = findMatchingRadioOption(options, matchedValue);

            if (matchingOption) {
              field.select(matchingOption);
              matchedFields.push(`${fieldName} <- ${matchingKey}`);
            } else {
              unmatchedFields.push(
                `${fieldName} (radio, valeur: ${matchedValue}, options: ${options.join(', ')})`,
              );
            }
          }
        } catch (fieldError) {
          console.warn(`Erreur lors du remplissage du champ ${fieldName}:`, fieldError);
          unmatchedFields.push(
            `${fieldName} (erreur: ${fieldError instanceof Error ? fieldError.message : 'inconnue'})`,
          );
        }
      } else {
        unmatchedFields.push(fieldName);
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[pdf] Champs remplis :', matchedFields.length);
      if (matchedFields.length > 0) {
        console.log('[pdf] Correspondances :', matchedFields);
      }
      if (unmatchedFields.length > 0) {
        console.warn('[pdf] Champs non remplis :', unmatchedFields);
      }
    }
  } catch (error) {
    console.error('Erreur lors du remplissage du formulaire PDF:', error);
    throw new Error(
      `Impossible de remplir le formulaire PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
    );
  }
}

// Réexport pour tests ou scripts d'audit
export {
  findMatchingRadioOption,
  isOuiNonRadioOptions,
  matchesPdfRadioOption,
  normalizeRadioOption,
} from './pdfRadioMatching';
