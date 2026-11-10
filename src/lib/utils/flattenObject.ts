/**
 * Aplatit un objet JavaScript imbriqué en utilisant la notation par points.
 * Les objets non sérialisables (Date, File, Blob) sont traités à part pour éviter toute récursion infinie.
 * 
 * @param obj L'objet JavaScript à aplatir
 * @param prefix Le préfixe de clé interne pour la récursivité (utilisé en interne)
 * @returns Un nouvel objet avec des clés aplaties utilisant la notation par points
 * 
 * @example
 * flattenObject({ a: { b: 1 }, c: [{ d: 2 }] })
 * // Retourne: { 'a.b': 1, 'c.0.d': 2 }
 */
export function flattenObject(obj: any, prefix = ''): Record<string, any> {
  // 1. Cas de base : null ou undefined
  if (obj === null || obj === undefined) {
    return {};
  }

  // 2. Si c'est un type primitif (string, number, boolean), on le retourne tel quel
  if (typeof obj !== 'object') {
    return prefix ? { [prefix]: obj } : {};
  }

  // 3. Types spéciaux à ne pas aplatir
  // Si c'est une Date, on la convertit en string
  if (obj instanceof Date) {
    return prefix ? { [prefix]: obj.toISOString().split('T')[0] } : {};
  }
  // Si c'est un Fichier ou un Blob (image), on l'ignore ou on garde juste le nom
  if (obj instanceof File || obj instanceof Blob) {
    return {}; // On ne veut pas injecter le fichier binaire dans les champs texte du PDF
  }

  // 4. Récursion sur les Tableaux et Objets
  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + '.' : '';
    const value = obj[k];
    
    // Si la valeur est un objet (et pas null), on continue de creuser
    if (typeof value === 'object' && value !== null) {
      // Cas spécial : Si c'est un tableau, on garde la notation indexée
      if (Array.isArray(value)) {
        value.forEach((item: any, index: number) => {
          Object.assign(acc, flattenObject(item, `${pre}${k}.${index}`));
        });
      } 
      // Si c'est un objet standard, on aplatit
      else if (!(value instanceof Date) && !(value instanceof File) && !(value instanceof Blob)) {
        Object.assign(acc, flattenObject(value, pre + k));
      }
      // Si c'est un objet spécial (Date, etc.), on le traite comme une valeur simple
      else {
         Object.assign(acc, flattenObject(value, pre + k));
      }
    } 
    // Si c'est une valeur simple
    else if (value !== undefined && value !== null) {
      // Inclure aussi les booléens false (nécessaire pour les champs PDF)
      if (typeof value === 'boolean' || value !== '') {
        acc[pre + k] = value;
      }
    }
    
    return acc;
  }, {} as Record<string, any>);
}