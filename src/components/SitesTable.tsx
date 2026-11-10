import { Link } from 'react-router-dom';
import { Calendar, PencilIcon, Archive, Trash2, RotateCcw, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import type { Site } from '../types';
import { Button } from './ui/Button';
import { DataTable, DataTableHeader, DataTableRow, DataTableHead, DataTableCell, DataTableBody } from './ui/DataTable';
import { cn } from '../lib/utils';

interface SitesTableProps {
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

const getInitials = (name: string | null | undefined): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getAvatarColor = (name: string | null | undefined): string => {
  if (!name) return 'from-primary/20 to-primary-600/20 border-primary/30';
  
  const hash = name.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const colors = [
    'from-primary/20 via-primary-600/20 to-primary-700/20 border-primary/30',
    'from-success/20 via-success/60 to-success/80 border-success/30',
    'from-warning/20 via-warning/60 to-warning/80 border-warning/30',
    'from-secondary/20 via-secondary/60 to-secondary/80 border-secondary/30',
    'from-primary-400/20 via-primary-600/20 to-primary-800/20 border-primary-400/30',
  ];
  
  return colors[Math.abs(hash) % colors.length];
};

export function SitesTable({
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
}: SitesTableProps) {
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableRow>
          <DataTableHead>Client</DataTableHead>
          <DataTableHead>Lieu</DataTableHead>
          <DataTableHead>Ingénieur</DataTableHead>
          <DataTableHead>Dernière mise à jour</DataTableHead>
          <DataTableHead className="text-right">Actions</DataTableHead>
        </DataTableRow>
      </DataTableHeader>
      <DataTableBody>
        <AnimatePresence>
          {sites.map((site, index) => {
            const timeAgo = formatDistanceToNow(new Date(site.updated_at || site.created_at), {
              addSuffix: true,
              locale: fr,
            });
            
            const siteCanEdit = canEdit ? canEdit(site) : false;
            const siteCanDelete = canDelete ? canDelete(site) : false;
            const siteCanRestore = canRestore ? canRestore(site) : false;

            return (
              <motion.tr
                key={site.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.02 }}
                className="group cursor-pointer"
                onClick={() => window.location.href = `/sites/${site.id}`}
              >
                <DataTableCell>
                  <Link
                    to={`/sites/${site.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block"
                  >
                    <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {site.name || '—'}
                    </div>
                    <div className="text-caption text-muted-foreground mt-1">
                      #{site.project_number}
                    </div>
                  </Link>
                </DataTableCell>
                <DataTableCell>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 text-body text-foreground">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{site.city || '—'}</span>
                    </div>
                    <div className={cn(
                      "shrink-0 px-2.5 py-1 rounded-full text-caption font-semibold border",
                      activeTab === 'active'
                        ? "bg-success/20 text-success border-success/30"
                        : "bg-warning/20 text-warning border-warning/30"
                    )}>
                      {activeTab === 'active' ? 'EN COURS' : 'ARCHIVÉ'}
                    </div>
                  </div>
                </DataTableCell>
                <DataTableCell>
                  {site.engineer_in_charge ? (
                    <div className="flex items-center gap-3">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className={cn(
                          "h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center border shadow-indigo-glow",
                          getAvatarColor(site.engineer_in_charge)
                        )}
                      >
                        <span className="text-caption font-semibold text-foreground">
                          {getInitials(site.engineer_in_charge)}
                        </span>
                      </motion.div>
                      <span className="text-body text-foreground">{site.engineer_in_charge}</span>
                    </div>
                  ) : (
                    <span className="text-body text-muted-foreground">—</span>
                  )}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex items-center gap-2 text-body text-muted-foreground">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>{timeAgo}</span>
                  </div>
                </DataTableCell>
                <DataTableCell>
                  <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    {activeTab === 'active' ? (
                      <>
                        {siteCanEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onEdit?.(site.id);
                            }}
                            title="Modifier"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        )}
                        {siteCanEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onArchive?.(site.id);
                            }}
                            disabled={isArchiving}
                            title="Archiver"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                        {siteCanDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onDelete?.(site.id);
                            }}
                            disabled={isDeleting}
                            title="Supprimer"
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
                            className="h-9 w-9 p-0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onRestore?.(site.id);
                            }}
                            disabled={isRestoring}
                            title="Restaurer"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        {siteCanDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onDelete?.(site.id);
                            }}
                            disabled={isDeleting}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </DataTableCell>
              </motion.tr>
            );
          })}
        </AnimatePresence>
      </DataTableBody>
    </DataTable>
  );
}
