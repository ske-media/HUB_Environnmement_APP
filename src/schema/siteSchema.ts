import { z } from 'zod';

export const SiteSchema = z.object({
  name: z.string().min(1, "Le nom du client est obligatoire."),
  projectNumber: z.string().min(1, "Le numéro d'affaire est obligatoire."),
  location: z.string().optional(),
  city: z.string().optional().refine(
    (val) => !val || val.length >= 3,
    { message: "La commune doit faire au moins 3 caractères." }
  ),
  projectManager: z.string().optional(),
  engineers: z.string().optional(),
  drillingCompany: z.string().optional(),
});

/** Type du formulaire de site, dérivé du schéma Zod. */
export type SiteFormData = z.infer<typeof SiteSchema>;