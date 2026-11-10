import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  /**
   * Affiche un toast.
   *
   * - `duration` : durée en ms. `0` ou négatif => toast persistant (pas de timer ni de barre de progression).
   * - `id` : identifiant stable facultatif ; si fourni, tout toast existant avec le même id est remplacé
   *   plutôt que dupliqué (utile pour les notifications offline répétées).
   */
  showToast: (type: ToastType, message: string, duration?: number, id?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, duration = 5000, id?: string) => {
    const toastId = id ?? Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { id: toastId, type, message, duration };

    setToasts(prev => {
      const withoutPrevious = prev.filter(t => t.id !== toastId);
      return [...withoutPrevious, newToast];
    });

    if (duration > 0) {
      setTimeout(() => removeToast(toastId), duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Composant Toast Container
function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  // Détection mobile pour positionnement adaptatif
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div 
      className={cn(
        "fixed z-toast space-y-3 pointer-events-none max-w-md w-full",
        // Mobile: bas de l'écran, centré, au-dessus de la barre de navigation
        isMobile 
          ? "bottom-28 left-1/2 -translate-x-1/2 px-4"
          // Desktop: bas à droite
          : "bottom-4 right-4 px-0"
      )}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast, index) => (
          <ToastItem 
            key={toast.id} 
            toast={toast} 
            onClose={() => removeToast(toast.id)}
            index={index}
            isMobile={isMobile}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Composant Toast Item
const ToastItem = React.forwardRef<HTMLDivElement, { toast: Toast; onClose: () => void; index: number; isMobile: boolean }>(
  ({ toast, onClose, index, isMobile }, ref) => {
    const progressRef = useRef<HTMLDivElement>(null);
    const duration = toast.duration ?? 5000;

    useEffect(() => {
      if (!progressRef.current || duration <= 0) return;
      
      const startTime = Date.now();
      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.max(0, 100 - (elapsed / duration) * 100);
        
        if (progressRef.current) {
          progressRef.current.style.width = `${progress}%`;
        }
        
        if (progress > 0) {
          requestAnimationFrame(updateProgress);
        }
      };
      
      requestAnimationFrame(updateProgress);
    }, [duration]);

    const icons = {
      success: CheckCircle,
      error: XCircle,
      warning: AlertCircle,
      info: Info
    };

    const variantConfig = {
      success: {
        iconColor: 'text-success',
        borderColor: 'border-success/50',
        bgColor: 'bg-success/10',
        glow: 'shadow-success-glow',
        progressGradient: 'from-success via-success-glow to-success',
      },
      error: {
        iconColor: 'text-error',
        borderColor: 'border-error/50',
        bgColor: 'bg-error/10',
        glow: 'shadow-error-glow',
        progressGradient: 'from-error via-error-glow to-error',
      },
      warning: {
        iconColor: 'text-warning',
        borderColor: 'border-warning/50',
        bgColor: 'bg-warning/10',
        glow: 'shadow-warning-glow',
        progressGradient: 'from-warning via-warning-glow to-warning',
      },
      info: {
        iconColor: 'text-primary',
        borderColor: 'border-primary/50',
        bgColor: 'bg-primary/10',
        glow: 'shadow-indigo-glow',
        progressGradient: 'from-primary via-primary-600 to-primary',
      },
    };

    const config = variantConfig[toast.type];
    const Icon = icons[toast.type];

    // Animations adaptées selon le device
    const initialAnimation = isMobile
      ? { opacity: 0, y: 100, scale: 0.95 }
      : { opacity: 0, x: 400, scale: 0.9, y: -20 };
    
    const exitAnimation = isMobile
      ? { 
          opacity: 0, 
          y: 100, 
          scale: 0.95,
          transition: { duration: 0.2, ease: 'easeIn' }
        }
      : { 
          opacity: 0, 
          x: 400, 
          scale: 0.9,
          transition: { duration: 0.2, ease: 'easeIn' }
        };

    return (
      <motion.div
        ref={ref}
        initial={initialAnimation}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        exit={exitAnimation}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 30,
          mass: 0.8,
          delay: index * 0.05,
        }}
        className="pointer-events-auto"
      >
        <div
          className={cn(
            'relative flex items-start gap-4 px-5 py-4 rounded-2xl shadow-indigo-glow-lg border-l-4',
            'backdrop-blur-xl bg-white/80 dark:bg-black/40',
            'border border-white/20 dark:border-white/10',
            'max-w-md w-full',
            config.borderColor,
            config.glow
          )}
        >
          {/* Icône animée */}
          <motion.div 
            className={cn('flex-shrink-0 mt-0.5', config.iconColor)}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              delay: 0.1,
            }}
          >
            <Icon className="h-6 w-6" />
          </motion.div>

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            <motion.p 
              className="text-body font-semibold text-foreground"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              {toast.message}
            </motion.p>
          </div>

          {/* Bouton fermer */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="flex-shrink-0 h-8 w-8 rounded-xl glass-panel border border-white/10 hover:bg-white/10 dark:hover:bg-surface-300/20 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </motion.button>

          {/* Barre de progression animée */}
          {duration > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50 rounded-b-2xl overflow-hidden">
              <motion.div
                ref={progressRef}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
                className={cn('h-full rounded-b-2xl bg-gradient-to-r', `bg-gradient-to-r ${config.progressGradient}`)}
              />
            </div>
          )}
        </div>
      </motion.div>
    );
  }
);

ToastItem.displayName = 'ToastItem';
