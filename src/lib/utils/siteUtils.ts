/**
 * Extrait le numéro de département depuis une adresse (code postal)
 * En France, les 2 premiers chiffres du code postal correspondent au département
 * @param location - L'adresse complète du site
 * @returns Le numéro de département (2 chiffres) ou null si non trouvé
 */
export function extractDepartmentFromLocation(location: string | null | undefined): string | null {
  if (!location) return null;
  
  // Chercher un code postal français (5 chiffres)
  const postcodeMatch = location.match(/\b(\d{5})\b/);
  if (postcodeMatch) {
    const postcode = postcodeMatch[1];
    // Extraire les 2 premiers chiffres (le département)
    return postcode.substring(0, 2);
  }
  
  return null;
}

/**
 * Formate la localisation avec la commune et le département
 * @param city - La commune
 * @param location - L'adresse complète (pour extraire le département)
 * @returns La localisation formatée "Commune (XX)" ou "Commune" si département non trouvé
 */
export function formatLocation(city: string | null | undefined, location: string | null | undefined): string {
  if (!city) return '';
  
  const department = extractDepartmentFromLocation(location);
  if (department) {
    return `${city} (${department})`;
  }
  
  return city;
}
