/**
 * Prélèveurs / chefs de projet autorisés dans les listes déroulantes terrain.
 * Filtre côté application uniquement — aucune modification en base.
 */
export const ALLOWED_FIELD_USER_IDS = new Set([
  'b37fc792-798e-4ff9-9da5-8d70eb94f0c5', // Gilles Falcone
  'c70849d3-f3cf-4aba-9e59-1639168ea5a9', // Justine Baugé
  '54f8d604-2e53-451f-9a03-5ac0e225d25e', // Julie VARIN
  '124b901c-1e1a-4348-b13d-879ace306420', // Lorry Triplet
  'a98f16ef-d6bf-4102-8f87-785a5e6e0db1', // Nicolas GARNIER-PINEL
  '1d6d36cb-0e68-4e72-8bc3-176ed5081b2b', // Nicolas JOULIA
  'a5bbc0e5-bad0-4ae4-8441-abdfdc5e2ea7', // Ronan BOUSQUEYNAUD
]);

export function isAllowedFieldUser(userId: string): boolean {
  return ALLOWED_FIELD_USER_IDS.has(userId);
}

/** Conserve une valeur déjà enregistrée en édition même si elle n'est plus proposée. */
export function withPreservedUserSelection(
  options: string[],
  selected?: string | null,
): string[] {
  const value = (selected ?? '').trim();
  if (!value || options.includes(value)) {
    return options;
  }
  return [...options, value];
}
