interface UserLabelInput {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

/**
 * Format d'affichage standardisé pour les préleveurs et
 * utilisateurs dans les listes / menus déroulants :
 *
 * - Si `last_name` est renseigné on affiche `"NOM Prénom"` (nom en MAJUSCULES
 *   en premier, convention française professionnelle).
 * - Sinon on retombe sur `full_name`.
 *
 * Les chaînes vides ou la mention "Utilisateur inconnu" sont rejetées pour
 * éviter de polluer les listes.
 */
export function formatUserLabel(input: UserLabelInput): string {
  const lastRaw = (input.last_name || '').trim();
  const firstRaw = (input.first_name || '').trim();
  const fullRaw = (input.full_name || '').trim();

  if (lastRaw) {
    const first = firstRaw || fullRaw.split(' ')[0] || '';
    return first ? `${lastRaw.toUpperCase()} ${first}` : lastRaw.toUpperCase();
  }

  if (fullRaw && fullRaw !== 'Utilisateur inconnu') {
    return fullRaw;
  }

  return '';
}
