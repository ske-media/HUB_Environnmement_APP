import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Archive, Download, FileStack, Loader2, X } from 'lucide-react';
import { Modal } from './ui/Modal';
import { CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';
import type { ExportProgress } from '../lib/pdf-generators/exportSurveys';

export type ExportMode = 'merge' | 'zip';

interface ExportSelectionDialogProps {
  isOpen: boolean;
  selectionCount: number;
  onCancel: () => void;
  onConfirm: (mode: ExportMode) => Promise<void> | void;
  progress?: ExportProgress | null;
  isRunning?: boolean;
}

const MODE_DETAILS: Record<ExportMode, {
  title: string;
  description: string;
  icon: typeof FileStack;
}> = {
  merge: {
    title: 'PDF fusionné',
    description: 'Toutes les fiches sont concaténées dans un seul PDF prêt à partager.',
    icon: FileStack,
  },
  zip: {
    title: 'Archive ZIP par type',
    description: 'Un ZIP avec un sous-dossier par type de fiche (sans dossier vide).',
    icon: Archive,
  },
};

export function ExportSelectionDialog({
  isOpen,
  selectionCount,
  onCancel,
  onConfirm,
  progress,
  isRunning = false,
}: ExportSelectionDialogProps) {
  const [mode, setMode] = useState<ExportMode>(selectionCount > 1 ? 'zip' : 'merge');

  useEffect(() => {
    if (!isOpen) return;
    setMode(selectionCount > 1 ? 'zip' : 'merge');
  }, [isOpen, selectionCount]);

  const handleConfirm = () => {
    onConfirm(mode);
  };

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isRunning ? () => {} : onCancel}
      showCloseButton={false}
      closeOnOverlayClick={!isRunning}
      className="max-w-lg"
    >
      <CardContent className="pt-6 pb-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/15 border border-primary/30 shadow-indigo-glow">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Exporter les fiches</h3>
              <p className="text-sm text-muted-foreground">
                {selectionCount} fiche{selectionCount > 1 ? 's' : ''} à exporter. Choisissez un
                format.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isRunning}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-surface-200/60 transition disabled:opacity-50"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(MODE_DETAILS) as ExportMode[]).map((key) => {
            const detail = MODE_DETAILS[key];
            const Icon = detail.icon;
            const selected = mode === key;
            const disabled = isRunning;
            return (
              <button
                key={key}
                type="button"
                onClick={() => !disabled && setMode(key)}
                disabled={disabled}
                className={cn(
                  'text-left p-4 rounded-xl border-2 transition-all duration-200 glass-panel',
                  selected
                    ? 'border-primary bg-primary/10 shadow-indigo-glow'
                    : 'border-surface-300 dark:border-surface-600 hover:border-primary/50',
                  disabled && 'opacity-60 cursor-not-allowed',
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-lg shrink-0',
                      selected
                        ? 'bg-primary/20 text-primary'
                        : 'bg-surface-200 text-muted-foreground',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground">{detail.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 leading-snug">
                      {detail.description}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {progress?.currentLabel
                  ? `Génération de « ${progress.currentLabel} »…`
                  : 'Génération des PDF…'}
              </span>
              <span>
                {progress?.completed ?? 0} / {progress?.total ?? selectionCount}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ ease: 'easeInOut', duration: 0.25 }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onCancel} disabled={isRunning}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={isRunning || selectionCount === 0}>
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération…
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Modal>
  );
}
