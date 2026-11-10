import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Bandeau discret affiché en haut de l'app quand `navigator.onLine === false`.
 *
 * - Reprend la couleur `primary` et l'effet translucide du reste de l'interface.
 * - Ne bloque rien : les formulaires continuent à accepter les soumissions
 *   (qui tombent dans la queue via `useSyncQueue`).
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine === false : false
  );

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className={cn(
            'fixed top-0 left-0 right-0 z-sticky',
            'pointer-events-auto',
            'pt-[env(safe-area-inset-top)]'
          )}
          role="status"
          aria-live="polite"
        >
          <div
            className={cn(
              'mx-auto mt-3 w-fit max-w-[calc(100%-1rem)]',
              'flex items-center gap-2 px-4 py-2 rounded-full',
              'backdrop-blur-xl bg-warning/15 border border-warning/40',
              'text-warning shadow-warning-glow'
            )}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning/70 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-warning" />
            </span>
            <CloudOff className="h-4 w-4" />
            <span className="text-sm font-medium">Mode hors-ligne — les fiches restent enregistrées localement.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
