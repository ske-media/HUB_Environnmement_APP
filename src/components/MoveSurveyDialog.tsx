import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, Building2, Loader2, MapPin, Search, X } from 'lucide-react';
import { Modal } from './ui/Modal';
import { CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import { cn } from '@/lib/utils';
import type { Site } from '../types';

interface MoveSurveyDialogProps {
  isOpen: boolean;
  currentSiteId: string | null;
  surveyLabel?: string;
  onCancel: () => void;
  onConfirm: (targetSiteId: string) => Promise<void> | void;
}

export function MoveSurveyDialog({
  isOpen,
  currentSiteId,
  surveyLabel,
  onCancel,
  onConfirm,
}: MoveSurveyDialogProps) {
  const [sites, setSites] = useState<Pick<Site, 'id' | 'name' | 'city' | 'project_number'>[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, city, project_number')
        .is('deleted_at', null)
        .order('city', { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error('Erreur chargement sites pour déplacement:', error);
        setSites([]);
      } else {
        setSites((data as any) || []);
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedSiteId(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  const filteredSites = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return sites
      .filter((s) => s.id !== currentSiteId)
      .filter((s) => {
        if (!needle) return true;
        return (
          (s.city || '').toLowerCase().includes(needle) ||
          (s.name || '').toLowerCase().includes(needle) ||
          (s.project_number || '').toLowerCase().includes(needle)
        );
      });
  }, [sites, search, currentSiteId]);

  const handleConfirm = async () => {
    if (!selectedSiteId) return;
    try {
      setSubmitting(true);
      await onConfirm(selectedSiteId);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onCancel}
      showCloseButton={false}
      closeOnOverlayClick={!submitting}
      className="max-w-xl"
    >
      <CardContent className="pt-6 pb-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/15 border border-primary/30 shadow-indigo-glow">
              <ArrowRightLeft className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Déplacer la fiche</h3>
              <p className="text-sm text-muted-foreground">
                {surveyLabel
                  ? `Choisir le site de destination pour « ${surveyLabel} ».`
                  : 'Choisir le site de destination.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-surface-200/60 transition"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par commune, client ou numéro d'affaire…"
            className={cn(
              'w-full pl-10 pr-4 h-11 rounded-lg border border-surface-300 dark:border-surface-600',
              'bg-background dark:bg-surface-200 text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition',
            )}
          />
        </div>

        <div className="max-h-[320px] overflow-auto -mx-2 px-2 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Chargement des sites…
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Aucun site correspondant.
            </div>
          ) : (
            filteredSites.map((site) => {
              const isSelected = selectedSiteId === site.id;
              return (
                <button
                  type="button"
                  key={site.id}
                  onClick={() => setSelectedSiteId(site.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-xl border-2 transition-all duration-200',
                    'glass-panel hover:border-primary/50',
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-indigo-glow'
                      : 'border-surface-300 dark:border-surface-600',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-lg shrink-0',
                        isSelected ? 'bg-primary/20 text-primary' : 'bg-surface-200 text-muted-foreground',
                      )}
                    >
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate">
                          {site.city || 'Commune inconnue'}
                        </span>
                        {site.project_number && (
                          <span className="text-xs px-2 py-0.5 rounded bg-surface-200/70 text-muted-foreground">
                            {site.project_number}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-sm text-muted-foreground truncate">
                        <Building2 className="h-3.5 w-3.5" />
                        <span className="truncate">{site.name}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!selectedSiteId || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Déplacement…
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Déplacer
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Modal>
  );
}
