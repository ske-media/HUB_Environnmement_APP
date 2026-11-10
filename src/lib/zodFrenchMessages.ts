import { z } from 'zod';

// Configuration des messages d'erreur Zod en français
export const frenchErrorMap: z.ZodErrorMap = (issue, ctx) => {
  let message: string;

  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined') {
        message = 'Ce champ est requis';
      } else if (issue.expected === 'number' && issue.received === 'string') {
        // Vérifier si c'est une virgule au lieu d'un point
        if (typeof issue.input === 'string' && issue.input.includes(',')) {
          message = 'Utilisez un point (.) au lieu d\'une virgule pour les nombres décimaux';
        } else {
          message = 'Veuillez saisir un nombre valide';
        }
      } else {
        message = `Attendu ${issue.expected}, reçu ${issue.received}`;
      }
      break;
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') {
        message = 'Email invalide';
      } else if (issue.validation === 'url') {
        message = 'URL invalide';
      } else {
        message = 'Format invalide';
      }
      break;
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        message = `Minimum ${issue.minimum} caractère${issue.minimum > 1 ? 's' : ''} requis`;
      } else if (issue.type === 'number') {
        message = `La valeur doit être supérieure ou égale à ${issue.minimum}`;
      } else {
        message = 'Valeur trop petite';
      }
      break;
    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') {
        message = `Maximum ${issue.maximum} caractère${issue.maximum > 1 ? 's' : ''} autorisé${issue.maximum > 1 ? 's' : ''}`;
      } else if (issue.type === 'number') {
        message = `La valeur doit être inférieure ou égale à ${issue.maximum}`;
      } else {
        message = 'Valeur trop grande';
      }
      break;
    case z.ZodIssueCode.invalid_enum_value:
      message = `Valeur invalide. Valeurs acceptées : ${issue.options.join(', ')}`;
      break;
    case z.ZodIssueCode.invalid_date:
      message = 'Date invalide';
      break;
    case z.ZodIssueCode.custom:
      message = issue.message || 'Erreur de validation';
      break;
    default:
      message = ctx?.defaultError || 'Erreur de validation';
  }

  return { message };
};

// Appliquer la configuration au démarrage
z.setErrorMap(frenchErrorMap);
