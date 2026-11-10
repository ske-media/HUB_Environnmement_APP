import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Building2, Plus } from 'lucide-react';
import { Sheet, SheetHeader, SheetTitle, SheetContent, SheetClose } from './ui/Sheet';
import { Button } from './ui/Button';
import { useActiveSites } from '../hooks/useSites';
import { Skeleton } from './ui/Skeleton';
import { cn } from '@/lib/utils';
import type { Site } from '../types';

interface SiteSelectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSiteSelect?: (siteId: string) => void;
  surveyType?: string; // Type de fiche sélectionné
}

export function SiteSelectionSheet({ open, onOpenChange, onSiteSelect, surveyType }: SiteSelectionSheetProps) {
  const navigate = useNavigate();
  const { data: sites = [], isLoading } = useActiveSites();

  const handleSiteSelect = (siteId: string) => {
    if (onSiteSelect) {
      onSiteSelect(siteId);
    } else if (surveyType) {
      // Si un type de fiche est fourni, naviguer directement vers le formulaire
      navigate(`/sites/${siteId}/surveys/${surveyType}/new`);
    } else {
      // Par défaut, naviguer vers la page de création de fiche pour ce site
      navigate(`/sites/${siteId}/surveys/new`);
    }
    onOpenChange(false);
  };

  const handleCreateSite = () => {
    onOpenChange(false);
    navigate('/sites/new');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="bottom">
      <SheetHeader showDragIndicator>
        <SheetTitle>Sélectionner un site</SheetTitle>
        <SheetClose onClose={() => onOpenChange(false)} />
      </SheetHeader>
      <SheetContent>
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : sites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-body-lg text-muted-foreground mb-4">
                Aucun site disponible
              </p>
              <Button variant="primary" onClick={handleCreateSite} className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" />
                Créer un site
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {sites.map((site: Site) => (
                  <motion.button
                    key={site.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSiteSelect(site.id)}
                    className={cn(
                      'w-full text-left glass-panel-lg p-4 rounded-xl',
                      'border border-white/10 hover:border-primary/30',
                      'hover:shadow-indigo-glow-sm transition-all duration-200',
                      'min-h-[80px] flex flex-col justify-center'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 p-2 rounded-lg bg-primary/20 border border-primary/30">
                        <Building2 className="h-5 w-5 text-primary dark:text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-foreground mb-1 truncate">
                          {site.name}
                        </h3>
                        {site.location && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{site.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
              <Button
                variant="secondary"
                onClick={handleCreateSite}
                className="w-full min-h-[44px]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer un nouveau site
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
