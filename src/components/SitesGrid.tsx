import { Link } from 'react-router-dom';
import { Calendar, PencilIcon, Archive, Trash2, RotateCcw, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import type { Site } from '../types';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

interface SitesGridProps {
  sites: Site[];
  activeTab: 'active' | 'archived';
  onEdit?: (siteId: string) => void;
  onArchive?: (siteId: string) => void;
  onDelete?: (siteId: string) => void;
  onRestore?: (siteId: string) => void;
  isDeleting?: boolean;
  isArchiving?: boolean;
  isRestoring?: boolean;
  canEdit?: (site: Site) => boolean;
  canDelete?: (site: Site) => boolean;
  canRestore?: (site: Site) => boolean;
}

// Fonction pour générer un gradient unique basé sur l'ID du site
const generateGradient = (id: string): string => {
  const hash = id.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 60) % 360;
  const saturation = 60 + (Math.abs(hash) % 20);
  const lightness = 50 + (Math.abs(hash) % 15);
  
  return `linear-gradient(135deg, hsl(${hue1}, ${saturation}%, ${lightness}%), hsl(${hue2}, ${saturation}%, ${lightness - 10}%))`;
};

const getInitials = (name: string | null | undefined): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function SitesGrid({
  sites,
  activeTab,
  onEdit,
  onArchive,
  onDelete,
  onRestore,
  isDeleting = false,
  isArchiving = false,
  isRestoring = false,
  canEdit,
  canDelete,
  canRestore,
}: SitesGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
      {sites.map((site, index) => {
        const timeAgo = formatDistanceToNow(new Date(site.updated_at || site.created_at), {
          addSuffix: true,
          locale: fr,
        });
        
        const siteCanEdit = canEdit ? canEdit(site) : false;
        const siteCanDelete = canDelete ? canDelete(site) : false;
        const siteCanRestore = canRestore ? canRestore(site) : false;
        
        const gradient = generateGradient(site.id);

        return (
          <motion.div
            key={site.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="group relative"
          >
            <Link
              to={`/sites/${site.id}`}
              className="block h-full"
            >
              <div className={cn(
                "relative h-full rounded-2xl overflow-hidden cursor-pointer",
                "glass-panel-lg border border-white/10",
                "hover:border-primary/30 hover:shadow-indigo-glow",
                "transition-all duration-300"
              )}>
                {/* Zone header avec gradient coloré */}
                <div 
                  className="relative h-32 overflow-hidden"
                  style={{ background: gradient }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-900 via-surface-900/50 to-transparent" />
                  
                </div>

                {/* Zone contenu */}
                <div className="p-5 space-y-4">
                  {/* Nom du client en titre principal */}
                  <div>
                    <h3 className="text-h2-lg font-bold text-foreground tracking-wide line-clamp-1">
                      {site.name || '—'}
                    </h3>
                    <p className="text-body text-muted-foreground mt-1">
                      #{site.project_number}
                    </p>
                  </div>

                  {/* Lieu en secondaire */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center text-body text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
                      <span className="truncate">{site.city || '—'}</span>
                    </div>
                    <div className={cn(
                      "shrink-0 px-3 py-1 rounded-full text-caption font-semibold",
                      "backdrop-blur-md border shadow-lg",
                      activeTab === 'active'
                        ? "bg-success/20 text-success border-success/30"
                        : "bg-warning/20 text-warning border-warning/30"
                    )}>
                      {activeTab === 'active' ? 'EN COURS' : 'ARCHIVÉ'}
                    </div>
                  </div>

                  {/* Footer avec ingénieur et date */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex items-center gap-3">
                      {site.engineer_in_charge && (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 via-primary-600/20 to-primary-700/20 border border-primary/30 flex items-center justify-center">
                          <span className="text-caption font-semibold text-primary">
                            {getInitials(site.engineer_in_charge)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-caption text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{timeAgo}</span>
                      </div>
                    </div>

                    {/* Actions - visibles au hover */}
                    <div 
                      className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.preventDefault()}
                    >
                      {activeTab === 'active' ? (
                        <>
                          {siteCanEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onEdit?.(site.id);
                              }}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                          )}
                          {siteCanEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onArchive?.(site.id);
                              }}
                              disabled={isArchiving}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                          {siteCanDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDelete?.(site.id);
                              }}
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          {siteCanRestore && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onRestore?.(site.id);
                              }}
                              disabled={isRestoring}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          {siteCanDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDelete?.(site.id);
                              }}
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
