// Nettoyer le stockage local en cas de déconnexion
export const clearSessionStorage = () => {
  try {
    // Ne supprimer que les caches spécifiques à l'application.
    // Supabase gère lui-même la persistance de la session dans localStorage.
    localStorage.removeItem('cachedSites');
  } catch (error) {
    console.error('Erreur lors du nettoyage du stockage:', error);
  }
};