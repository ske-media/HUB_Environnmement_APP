/**
 * Alias et transformations de valeurs avant remplissage AcroForm.
 * Corrige les écarts schéma formulaire ↔ template PDF (types, libellés, champs partagés).
 */
export function addSurveyPdfAliases(flattenedData: Record<string, unknown>): Record<string, unknown> {
  const expanded: Record<string, unknown> = { ...flattenedData };

  applyGroundwaterAliases(expanded);

  return expanded;
}

function setAlias(
  expanded: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  if (value !== undefined && value !== null && value !== '') {
    expanded[key] = value;
  }
}

function removeKey(expanded: Record<string, unknown>, key: string): void {
  delete expanded[key];
}

function applyGroundwaterAliases(expanded: Record<string, unknown>): void {
  const typeCapot = expanded['description_piezometre.etat_tete.type_capot'];
  if (typeof typeCapot === 'string') {
    setAlias(
      expanded,
      'description_piezometre.etat_tete.type_capot',
      typeCapot.replace(/-/g, ' '),
    );
  }

  const tubagePresent = expanded['description_piezometre.etat_tete.tubage'];
  const typeTubage = expanded['description_piezometre.etat_tete.type_tubage'];
  if (tubagePresent === true && typeTubage) {
    setAlias(expanded, 'description_piezometre.etat_tete.tubage', typeTubage);
  } else if (tubagePresent === false) {
    removeKey(expanded, 'description_piezometre.etat_tete.tubage');
  }

  const charbonActif = expanded['purge.traitement_eau.charbon_actif'];
  const traitementAutre = expanded['purge.traitement_eau.autre'];
  if (charbonActif === true) {
    setAlias(expanded, 'purge.traitement_eau.charbon_actif', 'Charbon actif');
  } else if (traitementAutre === true) {
    setAlias(expanded, 'purge.traitement_eau.charbon_actif', 'Autre');
  } else if (charbonActif === false && traitementAutre === false) {
    removeKey(expanded, 'purge.traitement_eau.charbon_actif');
  }

  const diametre = expanded['caracteristiques.diametre'];
  if (diametre === 'autre') {
    setAlias(expanded, 'caracteristiques.diametre', 'Autre');
  }
}
