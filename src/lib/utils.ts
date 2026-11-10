import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FieldError, FieldErrors } from 'react-hook-form';
import { format } from 'date-fns';

/**
 * Combine les classes Tailwind de manière sûre
 * Gère les conflits et les doublons automatiquement
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extrait une erreur imbriquée depuis les FieldErrors de react-hook-form
 * Supporte les chemins imbriqués comme "address.street" ou "contact.email"
 * @param errors - L'objet FieldErrors de react-hook-form
 * @param name - Le nom du champ (peut être un chemin avec des points)
 * @returns L'erreur correspondante ou undefined
 */
export function getNestedError(
  errors: FieldErrors,
  name: string
): FieldError | undefined {
  const parts = name.split('.');
  let current: any = errors;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return current as FieldError | undefined;
}

/**
 * Réessaie une fonction avec un backoff exponentiel
 * @param fn - La fonction à exécuter
 * @param maxRetries - Nombre maximum de tentatives (défaut: 3)
 * @param initialDelay - Délai initial en millisecondes (défaut: 1000)
 * @returns Le résultat de la fonction
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Si c'est la dernière tentative, on lance l'erreur
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Calculer le délai avec backoff exponentiel
      const delay = initialDelay * Math.pow(2, attempt);
      
      // Attendre avant de réessayer
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Formate une date en format local (YYYY-MM-DD) sans décalage horaire
 * Utilise date-fns pour éviter les problèmes de timezone avec toISOString()
 * 
 * @param date - La date à formater (optionnel, utilise la date actuelle par défaut)
 * @returns La date formatée en YYYY-MM-DD dans le fuseau horaire local
 * 
 * @example
 * // Si on est le 14 juillet 2024 à 23h00 en France (UTC+2)
 * // toISOString() donnerait "2024-07-13T21:00:00.000Z" (UTC)
 * // getLocalDateString() donnera "2024-07-14" (local)
 * getLocalDateString() // "2024-07-14"
 */
export function getLocalDateString(date?: Date): string {
  const dateToFormat = date || new Date();
  return format(dateToFormat, 'yyyy-MM-dd');
}

/**
 * Valide un fichier uploadé avant l'envoi
 * Vérifie le type MIME réel et la taille du fichier
 * 
 * @param file - Le fichier à valider
 * @param options - Options de validation
 * @param options.maxSizeMB - Taille maximale en Mo (défaut: 10)
 * @param options.allowedMimeTypes - Types MIME autorisés (défaut: images uniquement)
 * @returns Un objet avec isValid (boolean) et error (string | null)
 * 
 * @example
 * const result = validateUploadedFile(file, { maxSizeMB: 5, allowedMimeTypes: ['image/jpeg', 'image/png'] });
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 */
export function validateUploadedFile(
  file: File,
  options: {
    maxSizeMB?: number;
    allowedMimeTypes?: string[];
  } = {}
): { isValid: boolean; error: string | null } {
  const { maxSizeMB = 10, allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] } = options;

  // Vérifier la taille
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `Le fichier "${file.name}" est trop volumineux (${(file.size / 1024 / 1024).toFixed(2)} Mo). Taille maximale autorisée : ${maxSizeMB} Mo.`
    };
  }

  // Vérifier le type MIME réel (file.type peut être falsifié)
  // On vérifie d'abord l'extension comme première ligne de défense
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  
  if (fileExtension && !validExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: `Le fichier "${file.name}" a une extension non autorisée (.${fileExtension}). Extensions autorisées : ${validExtensions.join(', ')}.`
    };
  }

  // Vérifier le type MIME déclaré - doit commencer strictement par "image/"
  if (file.type) {
    // Vérification stricte : le type MIME doit commencer par "image/"
    if (!file.type.startsWith('image/')) {
      return {
        isValid: false,
        error: `Le type de fichier "${file.type}" n'est pas autorisé. Seuls les fichiers image sont acceptés.`
      };
    }
    // Vérification supplémentaire : doit être dans la liste des types autorisés si fournie
    if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `Le type de fichier "${file.type}" n'est pas autorisé. Types autorisés : ${allowedMimeTypes.join(', ')}.`
      };
    }
  }

  // Si le type MIME n'est pas défini, on accepte si l'extension est valide
  // (certains navigateurs ne définissent pas toujours file.type)
  if (!file.type && fileExtension && validExtensions.includes(fileExtension)) {
    return { isValid: true, error: null };
  }

  // Si ni type MIME ni extension valide, on rejette
  if (!file.type && (!fileExtension || !validExtensions.includes(fileExtension))) {
    return {
      isValid: false,
      error: `Impossible de déterminer le type du fichier "${file.name}". Veuillez utiliser une image (JPG, PNG, WebP).`
    };
  }

  return { isValid: true, error: null };
}
