import { useAuth } from '../contexts/AuthContext';
import type { Site, Survey } from '../types';

/**
 * Hook pour vérifier les permissions de l'utilisateur
 * Mode collaboratif : tous les utilisateurs authentifiés ont accès à tous les sites et fiches
 */
export function usePermission() {
  const { user, isSuperAdmin } = useAuth();

  /**
   * Vérifie si l'utilisateur peut supprimer un site
   * Mode collaboratif : tous les utilisateurs authentifiés peuvent supprimer tous les sites
   */
  const canDeleteSite = (site: Site): boolean => {
    return !!user;
  };

  /**
   * Vérifie si l'utilisateur peut modifier un site
   * Mode collaboratif : tous les utilisateurs authentifiés peuvent modifier tous les sites
   */
  const canEditSite = (site: Site): boolean => {
    return !!user;
  };

  /**
   * Vérifie si l'utilisateur peut archiver un site
   * Mode collaboratif : tous les utilisateurs authentifiés peuvent archiver tous les sites
   */
  const canArchiveSite = (site: Site): boolean => {
    return !!user;
  };

  /**
   * Vérifie si l'utilisateur peut restaurer un site
   * Mode collaboratif : tous les utilisateurs authentifiés peuvent restaurer tous les sites
   */
  const canRestoreSite = (site: Site): boolean => {
    return !!user;
  };

  /**
   * Vérifie si l'utilisateur peut supprimer une fiche
   * Mode collaboratif : tous les utilisateurs authentifiés peuvent supprimer toutes les fiches
   */
  const canDeleteSurvey = (survey: Survey): boolean => {
    return !!user;
  };

  /**
   * Vérifie si l'utilisateur peut modifier une fiche
   * Mode collaboratif : tous les utilisateurs authentifiés peuvent modifier toutes les fiches
   */
  const canEditSurvey = (survey: Survey, site?: Site): boolean => {
    return !!user;
  };

  /**
   * Vérifie si l'utilisateur peut accéder à l'administration
   * - Seuls les super_admin peuvent accéder
   */
  const canAccessAdmin = (): boolean => {
    return isSuperAdmin;
  };

  /**
   * Vérifie si l'utilisateur peut voir tous les sites
   * Mode collaboratif : tous les utilisateurs authentifiés peuvent voir tous les sites
   */
  const canViewAllSites = (): boolean => {
    return !!user;
  };

  return {
    canDeleteSite,
    canEditSite,
    canArchiveSite,
    canRestoreSite,
    canDeleteSurvey,
    canEditSurvey,
    canAccessAdmin,
    canViewAllSites,
    isSuperAdmin,
    user,
  };
}

