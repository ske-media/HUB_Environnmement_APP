#!/usr/bin/env node

/**
 * Audit des champs AcroForm des templates PDF.
 *
 * Ce script :
 *   1. Ouvre chaque template PDF dans `public/pdf-templates`.
 *   2. Liste tous les champs AcroForm (nom + type).
 *   3. Compare les noms de champs aux chemins extraits des schémas Zod
 *      correspondants (parsing superficiel des fichiers `.ts`) pour repérer
 *      les mappings potentiellement manquants.
 *   4. Vérifie la présence des champs critiques listés dans `CRITICAL_FIELDS`
 *      (nature_revetement_autre, substances_recherchees, …).
 *   5. Produit un rapport lisible + `scripts/pdf-field-audit-report.json`.
 *
 * Le script n'échoue pas sur les mappings ambigus : il produit un rapport.
 * Seuls les vrais manques (fichier absent, export introuvable, champ
 * critique absent) remontent un code de sortie 1.
 */

import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const PDF_GENERATORS_DIR = join(projectRoot, 'src', 'lib', 'pdf-generators');
const SCHEMAS_DIR = join(projectRoot, 'src', 'schema');
const TEMPLATES_DIR = join(projectRoot, 'public', 'pdf-templates');
const REPORT_PATH = join(__dirname, 'pdf-field-audit-report.json');

// ---------------------------------------------------------------------------
// Configuration des types pris en charge
// ---------------------------------------------------------------------------

const SURVEY_TYPES = [
  { key: 'gas', schema: 'gasSurvey', template: 'gas-survey-form-template.pdf' },
  { key: 'soil', schema: 'soilSurvey', template: 'soil-survey-form-template-1.pdf' },
  { key: 'excavation', schema: 'excavationSurvey', template: 'excavation-survey-form-template.pdf' },
  { key: 'groundwater', schema: 'groundwaterSurvey', template: 'groundwater-survey-form-template.pdf' },
  { key: 'pid', schema: 'pidSurvey', template: 'pid-survey-form-template.pdf' },
  { key: 'sediment', schema: 'sedimentSurvey', template: 'sediment-survey-form-template.pdf' },
  { key: 'surfaceWater', schema: 'surfaceWaterSurvey', template: 'surface-water-survey-form-template.pdf' },
  { key: 'tapWater', schema: 'tapWaterSurvey', template: 'tap-water-survey-form-template.pdf' },
  { key: 'riskAnalysis', schema: 'riskAnalysis', template: 'risk-analysis-form-template.pdf' },
  { key: 'icpeVisit', schema: 'icpeVisitQuestionnaire', template: 'icpe-visit-questionnaire-form-template.pdf' },
  { key: 'ambientAir', schema: 'ambientAirSurvey', template: 'ambient-air-survey-form-template.pdf' },
  { key: 'equipmentTracking', schema: 'equipmentTracking', template: 'equipment-tracking-form-template.pdf' },
  { key: 'gardenQuestionnaire', schema: 'gardenQuestionnaire', template: 'garden-questionnaire-form-template.pdf' },
  { key: 'piezometric', schema: 'piezometricSurvey', template: 'piezometric-survey-form-template.pdf' },
  { key: 'radonSoil', schema: 'radonSoilSurvey', template: 'radon-soil-survey-form-template.pdf' },
  { key: 'siteVisit', schema: 'siteVisitQuestionnaire', template: 'site-visit-questionnaire-form-template.pdf' },
];

// Champs critiques à vérifier explicitement dans chaque template.
const CRITICAL_FIELDS = {
  gas: [
    'nature_revetement',
    'nature_revetement_autre',
    'substances_recherchees.tph_c5_c16_btex_cohv_naphtalene',
  ],
  groundwater: [
    'purge.materiel',
    'purge.materiel_autre',
    'echantillonnage.materiel',
    'echantillonnage.materiel_autre',
    'echantillonnage.nettoyage_materiel',
    'echantillonnage.nettoyage_autre_details',
    'conditionnement.transporteur',
    'conditionnement.transporteur_autre',
    'conditionnement.substances.autre',
    'conditionnement.substances_autre_details',
    'caracteristiques.diametre',
    'caracteristiques.diametre_autre',
  ],
  excavation: ['conditionnement.substances_recherchees'],
  sediment: ['conditionnement.substances_recherchees'],
  tapWater: ['conditionnement.substances_recherchees'],
};

// ---------------------------------------------------------------------------
// Lecture des PDFs
// ---------------------------------------------------------------------------

function fieldTypeLabel(field) {
  if (field instanceof PDFTextField) return 'text';
  if (field instanceof PDFCheckBox) return 'checkbox';
  if (field instanceof PDFRadioGroup) return 'radio';
  return 'unknown';
}

async function readPdfFields(templatePath) {
  const bytes = readFileSync(templatePath);
  // Certains templates anciens contiennent des objets corrompus : on tolère
  // ces erreurs afin de pouvoir au moins lister les champs AcroForm.
  const pdfDoc = await PDFDocument.load(bytes, {
    updateMetadata: false,
    ignoreEncryption: true,
    throwOnInvalidObject: false,
  });
  const form = pdfDoc.getForm();
  return form.getFields().map((field) => ({
    name: field.getName(),
    type: fieldTypeLabel(field),
    ...(field instanceof PDFRadioGroup ? { options: field.getOptions() } : {}),
  }));
}

// ---------------------------------------------------------------------------
// Extraction "best-effort" des chemins d'un schéma Zod à partir du source TS.
// Ne traite pas les cas exotiques (unions, etc.) mais suffit pour l'audit.
// ---------------------------------------------------------------------------

function extractZodPaths(sourceCode) {
  const paths = new Set();
  const lines = sourceCode.split(/\r?\n/);

  const stack = []; // pile de préfixes actifs (ex: ['purge', 'traitement_eau'])
  // Heuristique : chaque bloc `k: z.object({` ouvre un préfixe, la parenthèse
  // fermante `})` correspondante le referme. On compte les accolades pour
  // suivre la profondeur.
  let pendingPrefix = null;
  let pendingBraceDepth = 0;
  const braceStack = []; // { prefix, openDepth }

  let depth = 0;

  const keyPattern = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/;
  const objectOpenPattern = /z\s*\.\s*object\s*\(\s*\{/;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\/\/.*$/, '');
    const keyMatch = line.match(keyPattern);
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    if (keyMatch) {
      const key = keyMatch[1];
      const fullPath = [...stack, key].join('.');
      paths.add(fullPath);

      if (objectOpenPattern.test(line)) {
        braceStack.push({ prefix: key, openDepth: depth + openBraces });
        stack.push(key);
      }
    }

    depth += openBraces - closeBraces;

    // Fermeture de blocs d'objets
    while (braceStack.length && depth < braceStack[braceStack.length - 1].openDepth) {
      braceStack.pop();
      stack.pop();
    }
  }

  return Array.from(paths);
}

// ---------------------------------------------------------------------------
// Matching identique à fillGenericAcroform (version Node)
// ---------------------------------------------------------------------------

function normalize(value) {
  return value.toLowerCase().replace(/[._\s-]/g, '');
}

function normalizeRadioOption(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function radioTokensForBoolean(value) {
  return new Set(
    value
      ? ['true', '1', 'oui', 'yes', 'o']
      : ['false', '0', 'non', 'no', 'n'],
  );
}

function isOuiNonRadioOptions(options = []) {
  const normalized = options.map(normalizeRadioOption);
  const hasOui = normalized.some((o) => radioTokensForBoolean(true).has(o));
  const hasNon = normalized.some((o) => radioTokensForBoolean(false).has(o));
  return hasOui && hasNon;
}

/** Champs booléen formulaire → radio PDF non Oui/Non, gérés par pdfFieldAliases.ts */
const BOOLEAN_RADIO_ALIAS_FIELDS = new Set([
  'description_piezometre.etat_tete.tubage',
  'purge.traitement_eau.charbon_actif',
]);

function isBooleanZodPath(path, schemaSrc) {
  const leaf = path.split('.').pop();
  return new RegExp(`${leaf}\\s*:\\s*z\\.boolean`).test(schemaSrc);
}

function findMatch(fieldName, schemaPaths) {
  const normalizedField = normalize(fieldName);
  // Stratégie exacte
  const exact = schemaPaths.find((p) => p === fieldName);
  if (exact) return { strategy: 'exact', path: exact };
  // Suffixe pointé
  const suffix = schemaPaths.find(
    (p) =>
      p.endsWith(`.${fieldName}`) ||
      fieldName.endsWith(`.${p}`) ||
      p.split('.').pop() === fieldName,
  );
  if (suffix) return { strategy: 'suffix', path: suffix };
  // Normalisée (points/underscores supprimés)
  const normalized = schemaPaths.find((p) => normalize(p) === normalizedField);
  if (normalized) return { strategy: 'normalized', path: normalized };
  // Substring
  const sub = schemaPaths.find((p) => {
    const a = p.toLowerCase();
    const b = fieldName.toLowerCase();
    return a.includes(b) || b.includes(a);
  });
  if (sub) return { strategy: 'substring', path: sub };
  return null;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

// Tous les types passent par `generatePdfDocument.ts` : un type est pris en
// charge s'il possède une entrée dans `SURVEY_PDF_CONFIG`.
const GENERATOR_SOURCE_PATH = join(PDF_GENERATORS_DIR, 'generatePdfDocument.ts');
const GENERATOR_SOURCE = existsSync(GENERATOR_SOURCE_PATH)
  ? readFileSync(GENERATOR_SOURCE_PATH, 'utf8')
  : '';

function hasPdfGenerator(typeKey) {
  const configKey = typeKey.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  return new RegExp(`^\\s+${configKey}: \\{`, 'm').test(GENERATOR_SOURCE);
}

async function auditType(type) {
  const schemaPath = join(SCHEMAS_DIR, `${type.schema}Schema.ts`);
  const templatePath = join(TEMPLATES_DIR, type.template);

  const entry = {
    type: type.key,
    hasGenerator: hasPdfGenerator(type.key),
    hasSchema: existsSync(schemaPath),
    hasTemplate: existsSync(templatePath),
    pdfFields: [],
    schemaPaths: [],
    unmatchedPdfFields: [],
    unusedSchemaPaths: [],
    matchedByStrategy: { exact: 0, suffix: 0, normalized: 0, substring: 0 },
    missingCritical: [],
    criticalPresent: [],
    booleanOuiNonRadios: [],
    booleanRadioMismatches: [],
  };

  if (!entry.hasTemplate || !entry.hasSchema) {
    return entry;
  }

  const pdfFields = await readPdfFields(templatePath);
  const schemaSrc = readFileSync(schemaPath, 'utf8');
  const schemaPaths = extractZodPaths(schemaSrc);

  entry.pdfFields = pdfFields;
  entry.schemaPaths = schemaPaths;

  const usedPaths = new Set();

  for (const field of pdfFields) {
    const match = findMatch(field.name, schemaPaths);
    if (match) {
      entry.matchedByStrategy[match.strategy]++;
      usedPaths.add(match.path);

      if (field.type === 'radio' && isBooleanZodPath(match.path, schemaSrc)) {
        const options = field.options || [];
        if (isOuiNonRadioOptions(options)) {
          entry.booleanOuiNonRadios.push({
            field: field.name,
            schemaPath: match.path,
            options,
          });
        } else if (!BOOLEAN_RADIO_ALIAS_FIELDS.has(field.name)) {
          entry.booleanRadioMismatches.push({
            field: field.name,
            schemaPath: match.path,
            options,
            hint: 'Ajouter un alias dans pdfFieldAliases.ts',
          });
        }
      }
    } else {
      entry.unmatchedPdfFields.push(field.name);
    }
  }

  entry.unusedSchemaPaths = schemaPaths.filter((p) => !usedPaths.has(p));

  const criticals = CRITICAL_FIELDS[type.key] || [];
  for (const critical of criticals) {
    const inPdf = pdfFields.some(
      (f) => f.name === critical || findMatch(f.name, [critical]) !== null,
    );
    if (inPdf) entry.criticalPresent.push(critical);
    else entry.missingCritical.push(critical);
  }

  return entry;
}

function printSummary(reports) {
  let hardFailures = 0;

  for (const report of reports) {
    const badge = report.hasGenerator && report.hasSchema && report.hasTemplate ? '[ok]' : '[!]';
    console.log(`\n${badge} ${report.type}`);
    if (!report.hasGenerator) {
      console.log('   ERREUR : générateur PDF manquant');
      hardFailures++;
    }
    if (!report.hasSchema) {
      console.log('   ERREUR : schéma Zod manquant');
      hardFailures++;
    }
    if (!report.hasTemplate) {
      console.log('   Template PDF absent (ignoré)');
      continue;
    }
    if (report.error) {
      console.log(`   Template PDF illisible (${report.error}). Audit ignoré.`);
      continue;
    }

    const total = (report.pdfFields || []).length;
    const matched =
      report.matchedByStrategy.exact +
      report.matchedByStrategy.suffix +
      report.matchedByStrategy.normalized +
      report.matchedByStrategy.substring;
    console.log(`   Champs PDF : ${total} — mappés : ${matched}`);
    console.log(
      `     exact:${report.matchedByStrategy.exact}` +
        `  suffix:${report.matchedByStrategy.suffix}` +
        `  normalized:${report.matchedByStrategy.normalized}` +
        `  substring:${report.matchedByStrategy.substring}`,
    );

    if (report.unmatchedPdfFields.length) {
      console.log(`   ${report.unmatchedPdfFields.length} champ(s) PDF sans mapping : `);
      for (const name of report.unmatchedPdfFields.slice(0, 10)) {
        console.log(`        · ${name}`);
      }
      if (report.unmatchedPdfFields.length > 10) {
        console.log(`        … (+${report.unmatchedPdfFields.length - 10})`);
      }
    }

    if (report.missingCritical.length) {
      console.log(`   ERREUR : champs critiques absents du template PDF :`);
      for (const field of report.missingCritical) {
        console.log(`        · ${field}`);
      }
      hardFailures += report.missingCritical.length;
    }

    if (report.booleanRadioMismatches?.length) {
      console.log(`   ERREUR : ${report.booleanRadioMismatches.length} radio PDF / booléen schéma sans alias :`);
      for (const item of report.booleanRadioMismatches) {
        console.log(`        · ${item.field} (${item.options.join(', ')})`);
      }
      hardFailures += report.booleanRadioMismatches.length;
    }

    if (report.booleanOuiNonRadios?.length) {
      console.log(
        `   ${report.booleanOuiNonRadios.length} radio Oui/Non <- booléen (couvert par pdfRadioMatching)`,
      );
    }
  }

  return hardFailures;
}

async function main() {
  console.log("Audit des templates PDF et des schémas Zod\n");

  const strict = process.argv.includes('--strict');

  const reports = [];
  for (const type of SURVEY_TYPES) {
    try {
      reports.push(await auditType(type));
    } catch (error) {
      reports.push({
        type: type.key,
        error: error.message,
        hasGenerator: hasPdfGenerator(type.key),
        hasSchema: existsSync(join(SCHEMAS_DIR, `${type.schema}Schema.ts`)),
        hasTemplate: existsSync(join(TEMPLATES_DIR, type.template)),
      });
    }
  }

  const hardFailures = printSummary(reports);

  writeFileSync(REPORT_PATH, JSON.stringify(reports, null, 2), 'utf8');
  console.log(`\nRapport détaillé écrit : ${REPORT_PATH}`);

  if (hardFailures > 0) {
    console.log(
      `\n${hardFailures} incohérence(s) détectée(s). ` +
        (strict
          ? 'Mode strict : sortie avec code 1.'
          : 'Mode tolérant : sortie OK (utilisez --strict pour échouer).'),
    );
    process.exit(strict ? 1 : 0);
  }
  console.log('\nAudit terminé sans incohérence bloquante.');
}

main().catch((err) => {
  console.error('Erreur fatale durant l\'audit:', err);
  process.exit(2);
});
