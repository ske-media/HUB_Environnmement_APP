import { Info } from 'lucide-react';
import { Button } from '../ui/Button';

interface DraftRestoreBannerProps {
  onRestore: () => void;
  onDismiss: () => void;
}

export function DraftRestoreBanner({ onRestore, onDismiss }: DraftRestoreBannerProps) {
  return (
    <div
      role="status"
      className="mb-6 rounded-xl border border-blue-500/40 bg-white/60 px-4 py-3 shadow-sm backdrop-blur-md dark:border-blue-400/35 dark:bg-zinc-950/55"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
            <Info className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Brouillon enregistré localement</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Une saisie précédente est disponible sur cet appareil. Vous pouvez la restaurer ou l’effacer.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={onDismiss}>
            Ignorer
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onRestore}>
            Restaurer
          </Button>
        </div>
      </div>
    </div>
  );
}
