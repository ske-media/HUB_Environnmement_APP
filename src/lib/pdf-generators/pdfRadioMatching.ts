export function normalizeRadioOption(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tokens acceptés pour une option radio Oui/Non (ex. PDF AcroForm « Oui » / « Non »). */
export function radioTokensForBoolean(value: boolean): Set<string> {
  return new Set(
    value
      ? ['true', '1', 'oui', 'yes', 'o']
      : ['false', '0', 'non', 'no', 'n'],
  );
}

export function isOuiNonRadioOptions(options: string[]): boolean {
  if (options.length === 0) return false;
  const normalized = options.map(normalizeRadioOption);
  const hasOui = normalized.some((o) => radioTokensForBoolean(true).has(o));
  const hasNon = normalized.some((o) => radioTokensForBoolean(false).has(o));
  return hasOui && hasNon;
}

export function matchesPdfRadioOption(option: string, matchedValue: unknown): boolean {
  const normalizedOption = normalizeRadioOption(option);

  if (typeof matchedValue === 'boolean') {
    return radioTokensForBoolean(matchedValue).has(normalizedOption);
  }

  const normalizedValue = normalizeRadioOption(String(matchedValue));
  if (normalizedOption === normalizedValue) {
    return true;
  }

  if (radioTokensForBoolean(true).has(normalizedValue)) {
    return radioTokensForBoolean(true).has(normalizedOption);
  }
  if (radioTokensForBoolean(false).has(normalizedValue)) {
    return radioTokensForBoolean(false).has(normalizedOption);
  }

  return false;
}

export function findMatchingRadioOption(
  options: string[],
  matchedValue: unknown,
): string | undefined {
  return options.find(
    (option) =>
      option === String(matchedValue) ||
      normalizeRadioOption(option) === normalizeRadioOption(String(matchedValue)) ||
      matchesPdfRadioOption(option, matchedValue),
  );
}

export function isTruthyCheckboxValue(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const normalized = normalizeRadioOption(value);
    return radioTokensForBoolean(true).has(normalized);
  }
  return false;
}
