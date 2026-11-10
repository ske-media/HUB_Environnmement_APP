#!/usr/bin/env node
/**
 * Tests légers (sans framework) pour la logique radio Oui/Non.
 * Aligné sur src/lib/pdf-generators/pdfRadioMatching.ts
 */

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

function matchesPdfRadioOption(option, matchedValue) {
  const normalizedOption = normalizeRadioOption(option);
  if (typeof matchedValue === 'boolean') {
    return radioTokensForBoolean(matchedValue).has(normalizedOption);
  }
  const normalizedValue = normalizeRadioOption(String(matchedValue));
  if (normalizedOption === normalizedValue) return true;
  if (radioTokensForBoolean(true).has(normalizedValue)) {
    return radioTokensForBoolean(true).has(normalizedOption);
  }
  if (radioTokensForBoolean(false).has(normalizedValue)) {
    return radioTokensForBoolean(false).has(normalizedOption);
  }
  return false;
}

function isOuiNonRadioOptions(options) {
  const normalized = options.map(normalizeRadioOption);
  const hasOui = normalized.some((o) => radioTokensForBoolean(true).has(o));
  const hasNon = normalized.some((o) => radioTokensForBoolean(false).has(o));
  return hasOui && hasNon;
}

const cases = [
  { option: 'Oui', value: true, expected: true },
  { option: 'Non', value: false, expected: true },
  { option: 'non', value: false, expected: true },
  { option: 'Oui', value: false, expected: false },
  { option: 'PVC', value: true, expected: false },
  { option: 'Hors sol', value: 'Hors-sol', expected: true },
  { option: 'Charbon actif', value: 'Charbon actif', expected: true },
];

let failed = 0;
for (const { option, value, expected } of cases) {
  const actual = matchesPdfRadioOption(option, value);
  if (actual !== expected) {
    console.error(`FAIL: matches(${option}, ${JSON.stringify(value)}) => ${actual}, expected ${expected}`);
    failed++;
  }
}

if (!isOuiNonRadioOptions(['Oui', 'Non'])) {
  console.error('FAIL: isOuiNonRadioOptions Oui/Non');
  failed++;
}
if (isOuiNonRadioOptions(['PVC', 'PEHD', 'Autre'])) {
  console.error('FAIL: PVC/PEHD should not be Oui/Non radio');
  failed++;
}

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log('selftest pdfRadioMatching : OK');
